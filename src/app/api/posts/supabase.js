import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/auth'
import { PostService, UserService } from '../../../../lib/database'
import { getPostsWithAuthor } from '../../../../lib/supabase'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    const authorId = searchParams.get('authorId')
    const visibility = searchParams.get('visibility')
    const limit = parseInt(searchParams.get('limit')) || 20
    const offset = parseInt(searchParams.get('offset')) || 0

    const filters = {}
    
    // Add user ID for visibility filtering
    if (session?.user?.id) {
      filters.userId = session.user.id
    }
    
    // Add author filter
    if (authorId) {
      filters.authorId = authorId
    }

    const posts = await getPostsWithAuthor(filters)
    
    // Apply additional filtering if needed
    let filteredPosts = posts
    
    if (visibility) {
      filteredPosts = posts.filter(post => post.visibility === visibility)
    }

    // Apply pagination
    const paginatedPosts = filteredPosts.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      posts: paginatedPosts,
      total: filteredPosts.length,
      hasMore: offset + limit < filteredPosts.length
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content, imageUrl, visibility = 'public' } = body

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    // Get user from database
    const user = await UserService.findByDiscordId(session.user.discordId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const postData = {
      author_id: user.id,
      content: content.trim(),
      image_url: imageUrl || null,
      visibility: visibility
    }

    const newPost = await PostService.create(postData)

    return NextResponse.json({
      success: true,
      post: newPost
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
