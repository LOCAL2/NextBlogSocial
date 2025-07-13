import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import connectDB from '../../../../../../lib/mongodb';
import User from '../../../../../../models/User';
import Post from '../../../../../../models/Post';
import Comment from '../../../../../../models/Comment';
import FriendRequest from '../../../../../../models/FriendRequest';
import AdminAction from '../../../../../../models/AdminAction';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { action, newUsername, reason } = await request.json();

    console.log('Admin action request:', { id, action, reason, newUsername });

    await connectDB();

    // Get current admin user
    const currentAdmin = await User.findOne({ discordId: session.user.discordId });
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from modifying other admins
    if (targetUser.role === 'admin' && targetUser._id.toString() !== currentAdmin._id.toString()) {
      return NextResponse.json({ error: 'Cannot modify other admins' }, { status: 403 });
    }

    let adminAction = null;

    switch (action) {
      case 'change_username':
        if (!newUsername || newUsername.trim().length === 0) {
          return NextResponse.json({ error: 'New username is required' }, { status: 400 });
        }

        // Check if username already exists
        const existingUser = await User.findOne({ 
          username: newUsername.trim(),
          _id: { $ne: id }
        });
        if (existingUser) {
          return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }

        const oldUsername = targetUser.username;
        targetUser.username = newUsername.trim();
        await targetUser.save();

        adminAction = {
          admin: currentAdmin._id,
          action: 'change_username',
          targetUser: id,
          details: {
            oldValue: oldUsername,
            newValue: newUsername.trim(),
            reason: reason || 'Admin username change'
          }
        };
        break;

      case 'ban_user':
        console.log('Banning user:', targetUser.username);
        targetUser.isActive = false;
        await targetUser.save();
        console.log('User banned successfully');

        adminAction = {
          admin: currentAdmin._id,
          action: 'ban_user',
          targetUser: id,
          details: {
            reason: reason || 'Admin ban'
          }
        };
        break;

      case 'unban_user':
        targetUser.isActive = true;
        await targetUser.save();

        adminAction = {
          admin: currentAdmin._id,
          action: 'unban_user',
          targetUser: id,
          details: {
            reason: reason || 'Admin unban'
          }
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Log admin action
    if (adminAction) {
      console.log('Creating admin action log:', adminAction);
      await AdminAction.create(adminAction);
      console.log('Admin action logged successfully');
    }

    const updatedUser = await User.findById(id)
      .select('username displayName email avatar role isActive createdAt lastLogin');

    console.log('Admin action completed successfully for user:', updatedUser.username);
    return NextResponse.json({
      message: 'Action completed successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { reason } = await request.json();

    await connectDB();

    // Get current admin user
    const currentAdmin = await User.findOne({ discordId: session.user.discordId });
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from deleting other admins
    if (targetUser.role === 'admin' && targetUser._id.toString() !== currentAdmin._id.toString()) {
      return NextResponse.json({ error: 'Cannot delete other admins' }, { status: 403 });
    }

    // Soft delete user's posts and comments
    await Post.updateMany(
      { author: id },
      {
        isDeleted: true,
        deletedBy: currentAdmin._id,
        deletedAt: new Date()
      }
    );

    await Comment.updateMany(
      { author: id },
      {
        isDeleted: true,
        deletedBy: currentAdmin._id,
        deletedAt: new Date()
      }
    );

    // Remove from friends lists
    await User.updateMany(
      { friends: id },
      { $pull: { friends: id } }
    );

    // Delete friend requests
    await FriendRequest.deleteMany({
      $or: [
        { sender: id },
        { receiver: id }
      ]
    });

    // Delete user account
    await User.findByIdAndDelete(id);

    // Log admin action
    await AdminAction.create({
      admin: currentAdmin._id,
      action: 'delete_user',
      targetUser: id,
      details: {
        reason: reason || 'Admin deletion',
        deletedUsername: targetUser.username,
        deletedEmail: targetUser.email
      }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
