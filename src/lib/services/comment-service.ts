import { BaseService, ServiceResult, PaginationOptions, SortOptions, FilterOptions } from './base-service'
import { Comment, MessageType, Prisma } from '@prisma/client'
import { z } from 'zod'

// Validation schemas
const createCommentSchema = z.object({
  contentId: z.string(),
  content: z.string().min(1).max(2000),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).optional(),
  parentId: z.string().optional(),
})

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

export interface CommentWithDetails extends Comment {
  author: {
    id: string
    username: string
    name: string
    avatar: string
  }
  parent?: {
    id: string
    content: string
    author: {
      id: string
      username: string
      name: string
    }
  }
  replies?: CommentWithDetails[]
  _count: {
    replies: number
    likes: number
  }
}

export interface CommentSearchOptions extends PaginationOptions, SortOptions, FilterOptions {
  contentId?: string
  authorId?: string
  parentId?: string | null
  type?: MessageType
  search?: string
}

export class CommentService extends BaseService {
  /**
   * Create a new comment
   */
  async createComment(data: any): Promise<ServiceResult<CommentWithDetails>> {
    try {
      // Check if user can create comments
      const canCreate = await this.checkPermission('hangout:create')
      if (!canCreate) {
        return this.createErrorResult('Access denied', 'You do not have permission to create comments')
      }

      // Validate input
      const validatedData = this.validateInput(data, createCommentSchema)

      // Check if content exists and user can access it
      const content = await this.db.content.findUnique({
        where: { id: validatedData.contentId },
        select: { id: true, creatorId: true, privacyLevel: true, type: true }
      })

      if (!content) {
        return this.createErrorResult('Content not found', 'The requested content does not exist')
      }

      // Check if user can access the content
      const canAccess = await this.canAccessResource('hangout', validatedData.contentId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to comment on this content')
      }

      // If replying to a comment, check if parent exists
      if (validatedData.parentId) {
        const parentComment = await this.db.comment.findUnique({
          where: { id: validatedData.parentId },
          select: { id: true, contentId: true }
        })

        if (!parentComment) {
          return this.createErrorResult('Parent comment not found', 'The parent comment does not exist')
        }

        if (parentComment.contentId !== validatedData.contentId) {
          return this.createErrorResult('Invalid parent', 'Parent comment does not belong to this content')
        }
      }

      const comment = await this.db.comment.create({
        data: {
          ...validatedData,
          authorId: this.context.userId,
          type: validatedData.type || 'TEXT'
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          },
          parent: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              replies: true,
              likes: true
            }
          }
        }
      })

      await this.logAction('create', 'comment', comment.id, null, {
        contentId: validatedData.contentId,
        parentId: validatedData.parentId,
        type: validatedData.type || 'TEXT'
      })

      return this.createSuccessResult(comment, 'Comment created successfully')
    } catch (error) {
      return this.handleError(error, 'Create comment')
    }
  }

  /**
   * Get comments for content
   */
  async getComments(contentId: string, options: CommentSearchOptions = {}): Promise<ServiceResult<{ comments: CommentWithDetails[]; pagination: any }>> {
    try {
      const {
        page = 1,
        limit = 50,
        parentId = null,
        type,
        search,
        field = 'createdAt',
        direction = 'desc'
      } = options

      const offset = (page - 1) * limit

      // Check if user can access the content
      const canAccess = await this.canAccessResource('hangout', contentId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view comments for this content')
      }

      // Build where clause
      const where: Prisma.CommentWhereInput = {
        contentId,
        parentId,
        ...(type && { type }),
        ...(search && {
          content: { contains: search, mode: 'insensitive' }
        })
      }

      const [comments, total] = await Promise.all([
        this.db.comment.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            },
            parent: {
              select: {
                id: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    name: true
                  }
                }
              }
            },
            _count: {
              select: {
                replies: true,
                likes: true
              }
            }
          },
          orderBy: { [field]: direction },
          skip: offset,
          take: limit
        }),
        this.db.comment.count({ where })
      ])

      const pagination = this.calculatePagination(page, limit, total)

      await this.logDataAccess('read', 'comments', contentId, { 
        parentId, 
        type, 
        search,
        pagination 
      })

      return this.createSuccessResult(
        { comments, pagination },
        'Comments retrieved successfully',
        pagination
      )
    } catch (error) {
      return this.handleError(error, 'Get comments')
    }
  }

  /**
   * Get comment by ID
   */
  async getCommentById(commentId: string): Promise<ServiceResult<CommentWithDetails>> {
    try {
      const comment = await this.db.comment.findUnique({
        where: { id: commentId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          },
          parent: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              replies: true,
              likes: true
            }
          }
        }
      })

      if (!comment) {
        return this.createErrorResult('Comment not found', 'The requested comment does not exist')
      }

      // Check if user can access the content
      const canAccess = await this.canAccessResource('hangout', comment.contentId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this comment')
      }

      await this.logDataAccess('read', 'comment', commentId)

      return this.createSuccessResult(comment, 'Comment retrieved successfully')
    } catch (error) {
      return this.handleError(error, 'Get comment by ID')
    }
  }

  /**
   * Update comment
   */
  async updateComment(commentId: string, data: any): Promise<ServiceResult<CommentWithDetails>> {
    try {
      // Check if user can update comments
      const canUpdate = await this.checkPermission('hangout:update')
      if (!canUpdate) {
        return this.createErrorResult('Access denied', 'You do not have permission to update comments')
      }

      // Validate input
      const validatedData = this.validateInput(data, updateCommentSchema)

      // Get current comment
      const currentComment = await this.db.comment.findUnique({
        where: { id: commentId },
        select: { id: true, authorId: true, content: true, contentId: true }
      })

      if (!currentComment) {
        return this.createErrorResult('Comment not found', 'The requested comment does not exist')
      }

      // Check if user is the author or has admin permissions
      if (currentComment.authorId !== this.context.userId) {
        const canModerate = await this.checkPermission('user:moderate')
        if (!canModerate) {
          return this.createErrorResult('Access denied', 'You can only update your own comments')
        }
      }

      // Check if user can access the content
      const canAccess = await this.canAccessResource('hangout', currentComment.contentId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to update comments for this content')
      }

      const updatedComment = await this.db.comment.update({
        where: { id: commentId },
        data: validatedData,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          },
          parent: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              replies: true,
              likes: true
            }
          }
        }
      })

      await this.logAction('update', 'comment', commentId, { content: currentComment.content }, validatedData)

      return this.createSuccessResult(updatedComment, 'Comment updated successfully')
    } catch (error) {
      return this.handleError(error, 'Update comment')
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<ServiceResult<void>> {
    try {
      // Check if user can delete comments
      const canDelete = await this.checkPermission('hangout:delete')
      if (!canDelete) {
        return this.createErrorResult('Access denied', 'You do not have permission to delete comments')
      }

      // Get current comment
      const currentComment = await this.db.comment.findUnique({
        where: { id: commentId },
        select: { id: true, authorId: true, content: true, contentId: true }
      })

      if (!currentComment) {
        return this.createErrorResult('Comment not found', 'The requested comment does not exist')
      }

      // Check if user is the author or has admin permissions
      if (currentComment.authorId !== this.context.userId) {
        const canModerate = await this.checkPermission('user:moderate')
        if (!canModerate) {
          return this.createErrorResult('Access denied', 'You can only delete your own comments')
        }
      }

      // Check if user can access the content
      const canAccess = await this.canAccessResource('hangout', currentComment.contentId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to delete comments for this content')
      }

      // Delete comment (cascade will handle replies)
      await this.db.comment.delete({
        where: { id: commentId }
      })

      await this.logAction('delete', 'comment', commentId, { content: currentComment.content }, null)

      return this.createSuccessResult(undefined, 'Comment deleted successfully')
    } catch (error) {
      return this.handleError(error, 'Delete comment')
    }
  }

  /**
   * Get comment replies
   */
  async getCommentReplies(commentId: string, options: PaginationOptions = {}): Promise<ServiceResult<{ replies: CommentWithDetails[]; pagination: any }>> {
    try {
      const { page = 1, limit = 20 } = options
      const offset = (page - 1) * limit

      // Get parent comment to check access
      const parentComment = await this.db.comment.findUnique({
        where: { id: commentId },
        select: { id: true, contentId: true, authorId: true }
      })

      if (!parentComment) {
        return this.createErrorResult('Comment not found', 'The requested comment does not exist')
      }

      // Check if user can access the content
      const canAccess = await this.canAccessResource('hangout', parentComment.contentId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view replies for this comment')
      }

      const [replies, total] = await Promise.all([
        this.db.comment.findMany({
          where: { parentId: commentId },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            },
            parent: {
              select: {
                id: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    name: true
                  }
                }
              }
            },
            _count: {
              select: {
                replies: true,
                likes: true
              }
            }
          },
          orderBy: { createdAt: 'asc' },
          skip: offset,
          take: limit
        }),
        this.db.comment.count({ where: { parentId: commentId } })
      ])

      const pagination = this.calculatePagination(page, limit, total)

      await this.logDataAccess('read', 'comment_replies', commentId, { pagination })

      return this.createSuccessResult(
        { replies, pagination },
        'Comment replies retrieved successfully',
        pagination
      )
    } catch (error) {
      return this.handleError(error, 'Get comment replies')
    }
  }

  /**
   * Like/unlike comment
   */
  async toggleCommentLike(commentId: string): Promise<ServiceResult<{ liked: boolean; likeCount: number }>> {
    try {
      // Check if user can like comments
      const canLike = await this.checkPermission('hangout:read')
      if (!canLike) {
        return this.createErrorResult('Access denied', 'You do not have permission to like comments')
      }

      // Get comment to check access
      const comment = await this.db.comment.findUnique({
        where: { id: commentId },
        select: { id: true, contentId: true, _count: { select: { likes: true } } }
      })

      if (!comment) {
        return this.createErrorResult('Comment not found', 'The requested comment does not exist')
      }

      // Check if user can access the content
      const canAccess = await this.canAccessResource('hangout', comment.contentId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to like comments for this content')
      }

      // Check if user already liked the comment
      const existingLike = await this.db.contentLike.findFirst({
        where: {
          contentId: commentId,
          userId: this.context.userId
        }
      })

      let liked: boolean
      let likeCount: number

      if (existingLike) {
        // Unlike
        await this.db.contentLike.delete({
          where: { id: existingLike.id }
        })
        liked = false
        likeCount = comment._count.likes - 1
      } else {
        // Like
        await this.db.contentLike.create({
          data: {
            contentId: commentId,
            userId: this.context.userId
          }
        })
        liked = true
        likeCount = comment._count.likes + 1
      }

      await this.logAction(liked ? 'like' : 'unlike', 'comment', commentId, null, { liked })

      return this.createSuccessResult({ liked, likeCount }, `Comment ${liked ? 'liked' : 'unliked'} successfully`)
    } catch (error) {
      return this.handleError(error, 'Toggle comment like')
    }
  }

  /**
   * Get user's comments
   */
  async getUserComments(userId: string, options: PaginationOptions = {}): Promise<ServiceResult<{ comments: CommentWithDetails[]; pagination: any }>> {
    try {
      const { page = 1, limit = 20 } = options
      const offset = (page - 1) * limit

      // Check if user can view this user's comments
      const canAccess = await this.canAccessResource('user', userId, 'read')
      if (!canAccess) {
        return this.createErrorResult('Access denied', 'You do not have permission to view this user\'s comments')
      }

      const [comments, total] = await Promise.all([
        this.db.comment.findMany({
          where: { authorId: userId },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            },
            parent: {
              select: {
                id: true,
                content: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    name: true
                  }
                }
              }
            },
            _count: {
              select: {
                replies: true,
                likes: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        this.db.comment.count({ where: { authorId: userId } })
      ])

      const pagination = this.calculatePagination(page, limit, total)

      await this.logDataAccess('read', 'user_comments', userId, { pagination })

      return this.createSuccessResult(
        { comments, pagination },
        'User comments retrieved successfully',
        pagination
      )
    } catch (error) {
      return this.handleError(error, 'Get user comments')
    }
  }
}












