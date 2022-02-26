import { EntityManager } from '@mikro-orm/core'
import { Arg, Ctx, Mutation, Resolver } from 'type-graphql'

import { createTaskAction, removeTaskAction, updateTaskAction } from '../actions/TaskActions'

import { TaskInputData } from 'src/types/classes/TaskInputData'

import { Task } from 'src/types/entities/Task'
import { User } from 'src/types/entities/User'

@Resolver()
export class TaskResolver {
  @Mutation(() => Task)
  async createTask (
    @Ctx('em') em: EntityManager,
      @Ctx('user') loggedUser: User,
      @Arg('data', () => TaskInputData) data: TaskInputData
  ): Promise<Task> {
    return await createTaskAction(loggedUser, data, em)
  }

  @Mutation(() => Task)
  async editTask (
    @Ctx('em') em: EntityManager,
      @Ctx('user') loggedUser: User,
      @Arg('id') id: string,
      @Arg('data', () => TaskInputData) data: TaskInputData
  ): Promise<Task> {
    return await updateTaskAction(loggedUser, id, data, em)
  }

  @Mutation(() => Boolean)
  async deleteTask (
    @Ctx('em') em: EntityManager,
      @Ctx('user') loggedUser: User,
      @Arg('id') id: string
  ): Promise<boolean> {
    return await removeTaskAction(loggedUser, id, em)
  }
}
