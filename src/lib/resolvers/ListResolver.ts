import { EntityManager } from '@mikro-orm/core'
import { ListInputData } from 'src/types/classes/ListInputData'
import { List } from 'src/types/entities/List'
import { User } from 'src/types/entities/User'
import { Arg, Ctx, Mutation, Query, Resolver } from 'type-graphql'
import { cloneAction, createListAction, getCompletedListsAction, getListAction, getListsAction, removeListAction, updateListAction } from '../actions/ListActions'

@Resolver()
export class ListResolver {
  @Query(() => [List])
  async getLists (
    @Ctx('em') em: EntityManager
  ): Promise<List[]> {
    return await getListsAction(em)
  }

  @Query(() => List)
  async getList (
    @Ctx('em') em: EntityManager,
      @Arg('id') id: string
  ): Promise<List | null> {
    return await getListAction(id, em)
  }

  @Query(() => [List])
  async getCompletedLists (
    @Ctx('em') em: EntityManager
  ): Promise<List[]> {
    return await getCompletedListsAction(em)
  }

  @Mutation(() => List)
  async createList (
    @Ctx('em') em: EntityManager,
      @Ctx('user') loggedUser: User,
      @Arg('data', () => ListInputData) data: ListInputData
  ): Promise<List> {
    return await createListAction(loggedUser, data, em)
  }

  @Mutation(() => List)
  async editList (
    @Ctx('em') em: EntityManager,
      @Ctx('user') loggedUser: User,
      @Arg('id') id: string,
      @Arg('data', () => ListInputData) data: ListInputData
  ): Promise<List> {
    return await updateListAction(loggedUser, id, data, em)
  }

  @Mutation(() => Boolean)
  async deleteList (
    @Ctx('em') em: EntityManager,
      @Ctx('user') loggedUser: User,
      @Arg('id') id: string
  ): Promise<boolean> {
    return await removeListAction(loggedUser, id, em)
  }

  @Mutation(() => List)
  async clone (
    @Ctx('em') em: EntityManager,
      @Arg('id') id: string
  ): Promise<List> {
    return await cloneAction(id, em)
  }
}
