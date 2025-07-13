-- NextBlog Social - Complete Supabase Schema with Real-time Features
-- Run this entire file in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE post_visibility AS ENUM ('public', 'followers', 'private');
CREATE TYPE notification_type AS ENUM ('like', 'comment', 'follow', 'friend_request', 'friend_accept', 'comment_deleted');
CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'blocked');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    discord_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    email VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    role user_role DEFAULT 'user',
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User titles table
CREATE TABLE user_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges table  
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#10B981',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User title assignments
CREATE TABLE user_title_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title_id UUID REFERENCES user_titles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, title_id)
);

-- User badge assignments
CREATE TABLE user_badge_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES user_badges(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    visibility post_visibility DEFAULT 'public',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post likes table
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by UUID REFERENCES users(id),
    delete_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comment likes table
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Follows table
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Friends table
CREATE TABLE friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status friend_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id),
    CHECK (requester_id != addressee_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    related_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    related_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_online ON users(is_online);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_friends_requester_id ON friends(requester_id);
CREATE INDEX idx_friends_addressee_id ON friends(addressee_id);
CREATE INDEX idx_friends_status ON friends(status);
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_friends_updated_at BEFORE UPDATE ON friends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Functions for automatic counter updates
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply counter triggers
CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER trigger_update_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

CREATE TRIGGER trigger_update_post_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_title_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badge_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = discord_id);

-- RLS Policies for posts table
CREATE POLICY "Anyone can view public posts" ON posts FOR SELECT USING (
    visibility = 'public' OR
    author_id IN (
        SELECT id FROM users WHERE discord_id = auth.uid()::text
    )
);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (
    author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (
    author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (
    author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);

-- RLS Policies for comments table
CREATE POLICY "Anyone can view comments on visible posts" ON comments FOR SELECT USING (
    post_id IN (
        SELECT id FROM posts WHERE
        visibility = 'public' OR
        author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
    )
);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (
    author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (
    author_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);

-- RLS Policies for likes
CREATE POLICY "Anyone can view likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON post_likes FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);

CREATE POLICY "Anyone can view comment likes" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own comment likes" ON comment_likes FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON follows FOR ALL USING (
    follower_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);

-- RLS Policies for friends
CREATE POLICY "Users can view own friend relationships" ON friends FOR SELECT USING (
    requester_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text) OR
    addressee_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);
CREATE POLICY "Users can manage own friend requests" ON friends FOR ALL USING (
    requester_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text) OR
    addressee_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
    recipient_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (
    recipient_id IN (SELECT id FROM users WHERE discord_id = auth.uid()::text)
);

-- Admin policies for titles and badges
CREATE POLICY "Anyone can view titles" ON user_titles FOR SELECT USING (true);
CREATE POLICY "Anyone can view badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Anyone can view title assignments" ON user_title_assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can view badge assignments" ON user_badge_assignments FOR SELECT USING (true);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE friends;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Insert default titles and badges
INSERT INTO user_titles (name, description, color, icon) VALUES
('Newbie', 'New member of the community', '#10B981', '🌱'),
('Regular', 'Active community member', '#3B82F6', '⭐'),
('Veteran', 'Long-time community member', '#8B5CF6', '🏆'),
('Legend', 'Legendary community member', '#F59E0B', '👑');

INSERT INTO user_badges (name, description, color, icon) VALUES
('First Post', 'Created your first post', '#10B981', '📝'),
('Social Butterfly', 'Made 10 friends', '#EC4899', '🦋'),
('Popular', 'Received 100 likes', '#F59E0B', '🔥'),
('Helpful', 'Received 50 comment likes', '#3B82F6', '💡'),
('Early Adopter', 'One of the first users', '#8B5CF6', '🚀');

-- Create helpful views
CREATE VIEW user_stats AS
SELECT
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.role,
    u.is_online,
    u.created_at,
    COALESCE(post_count.count, 0) as posts_count,
    COALESCE(follower_count.count, 0) as followers_count,
    COALESCE(following_count.count, 0) as following_count,
    COALESCE(friend_count.count, 0) as friends_count
FROM users u
LEFT JOIN (
    SELECT author_id, COUNT(*) as count
    FROM posts
    WHERE is_deleted = false
    GROUP BY author_id
) post_count ON u.id = post_count.author_id
LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM follows
    GROUP BY following_id
) follower_count ON u.id = follower_count.following_id
LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM follows
    GROUP BY follower_id
) following_count ON u.id = following_count.follower_id
LEFT JOIN (
    SELECT
        user_id,
        COUNT(*) as count
    FROM (
        SELECT requester_id as user_id FROM friends WHERE status = 'accepted'
        UNION ALL
        SELECT addressee_id as user_id FROM friends WHERE status = 'accepted'
    ) friend_relationships
    GROUP BY user_id
) friend_count ON u.id = friend_count.user_id;
