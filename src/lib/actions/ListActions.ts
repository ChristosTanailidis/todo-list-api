import { EntityManager } from '@mikro-orm/core'

import { ListInputData } from 'src/types/classes/ListInputData'

import { List } from 'src/types/entities/List'
import { Task } from 'src/types/entities/Task'
import { User } from 'src/types/entities/User'

export async function getListsAction (em: EntityManager): Promise<List[]> {
  return await em.find(List, {}, ['tasks', 'owner'])
}

export async function getListAction (id: string, em: EntityManager): Promise<List> {
  return await em.findOneOrFail(List, id)
}

export async function getCompletedListsAction (em: EntityManager): Promise<List[]> {
  const lists = await em.find(List, {}, ['tasks', 'owner'])

  const completedList: List[] = []

  lists.forEach(list => {
    const res = list.tasks.getItems().filter(task => task.done)
    if ((res.length === list.tasks.length) && (list.tasks.getItems().length > 0)) {
      completedList.push(list)
    }
  })

  return completedList
}

export async function createListAction (loggedUser: User, data: ListInputData, em: EntityManager): Promise<List> {
  const user = await em.findOneOrFail(User, loggedUser.id)

  const list = em.create(List, { ...data, user })

  await em.persistAndFlush(list)

  return list
}

export async function updateListAction (loggedUser: User, id: string, data: ListInputData, em: EntityManager): Promise<List> {
  const list = await em.findOneOrFail(List, id)
  const user = await em.findOneOrFail(User, loggedUser.id)

  // cant update list if you are not the owner of the list
  if (user.id !== list.owner.id) {
    throw new Error('Cant update list: This must be your list in order to change it')
  }

  // cant update list owner
  if (data.owner !== user.id) {
    throw new Error('Cant update list: Owner cant be updated')
  }

  em.assign(list, { ...data, type: list.type, capacity: list.capacity, user })
  await em.flush()

  return list
}

export async function removeListAction (loggedUser: User, id: string, em: EntityManager): Promise<boolean> {
  const list = await em.findOneOrFail(List, id, ['tasks', 'owner'])
  const user = await em.findOneOrFail(User, loggedUser.id)

  // cant remove list if you are not the owner of the list
  if (user.id !== list.owner.id) {
    throw new Error('Cant remove list: This must be your list in order to remove it')
  }

  await em.removeAndFlush(list)

  return true
}

// need to check if clone works! <--------------------------------------------
export async function cloneAction (id: string, em: EntityManager): Promise<List> {
  // CREATE LIST
  const baseList = await em.findOneOrFail(List, id, ['tasks', 'owner'])
  const user = baseList.owner // todo owner is logged user

  const rndSlug = Math.random() * (9999 - 1000) + 1000

  // todo check that new slug < 25

  const data = {
    slug: `${baseList.slug}${rndSlug}`,
    title: baseList.title,
    type: baseList.type,
    capacity: baseList.capacity
  }

  const newList = em.create(List, { ...data, user })

  await em.persistAndFlush(newList)

  const tasks = baseList.tasks.getItems().map((task) => {
    const createdTask = em.create(Task, {
      done: false,
      name: task.name,
      list: newList
    })
    em.persist(createdTask)
    return createdTask
  })

  await em.flush()

  console.log(tasks)

  return newList
}
