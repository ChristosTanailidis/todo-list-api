import { EntityManager } from '@mikro-orm/core'

import { TaskInputData } from 'src/types/classes/TaskInputData'

import { List } from 'src/types/entities/List'
import { Task } from 'src/types/entities/Task'
import { User } from 'src/types/entities/User'

export async function createTaskAction (loggedUser: User, data: TaskInputData, em: EntityManager): Promise<Task> {
  const list = await em.findOneOrFail(List, data.list, ['tasks', 'owner'])
  const user = await em.findOneOrFail(User, loggedUser.id)

  // cant create task in that list if you are not the owner of the list
  if (user.id !== list.owner.id) {
    throw new Error('Cant create task: This must be your list in order to add tasks to it!')
  }

  // Capacity is at maximum
  if (list.tasks.length >= list.capacity) {
    throw new Error('Cant create task: List capacity is at maximum!')
  }

  // Name exists in this list
  const found = list.tasks.getItems().find(task => task.name === data.name)
  if (found) {
    throw new Error('Cant create task: Task name already exists in this list!')
  }

  const task = em.create(Task, { ...data, type: list.type })

  await em.persistAndFlush(task)

  return task
}

export async function updateTaskAction (loggedUser: User, id: string, data: TaskInputData, em: EntityManager): Promise<Task> {
  const task = await em.findOneOrFail(Task, id)
  const list = await em.findOneOrFail(List, { id: data.list }, ['tasks', 'owner'])
  const user = await em.findOneOrFail(User, loggedUser.id)

  // cant update task in that list if you are not the owner of the list
  if (user.id !== list.owner.id) {
    throw new Error('Cant update task: This must be your list in order to update a task!')
  }

  // Name exists in this list
  const found = list.tasks.getItems().find(task => task.name === data.name)
  if (found && found.id !== id) {
    throw new Error('Cant create task: Task name already exists in this list!')
  }

  em.assign(task, { ...data, type: list.type })
  await em.flush()

  return task
}

export async function removeTaskAction (loggedUser: User, id: string, em: EntityManager): Promise<boolean> {
  const task = await em.findOneOrFail(Task, { id }, ['list'])
  const user = await em.findOneOrFail(User, loggedUser.id)

  // cant remove task in that list if you are not the owner of the list
  if (user.id !== task.list.owner.id) {
    throw new Error('Cant remove task: This must be your list in order to remove a task!')
  }

  await em.removeAndFlush(task)

  return true
}
