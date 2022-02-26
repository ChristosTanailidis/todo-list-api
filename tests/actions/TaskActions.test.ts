import { Collection, EntityManager } from '@mikro-orm/core'
import { createTaskAction, removeTaskAction, updateTaskAction } from 'src/lib/actions/TaskActions'
import { TaskInputData } from 'src/types/classes/TaskInputData'
import { List } from 'src/types/entities/List'
import { Task } from 'src/types/entities/Task'
import { User } from 'src/types/entities/User'
import TypeEnum from 'src/types/enums/TypeEnum'
import { getConnection } from 'tests/createConnection'

let em: EntityManager
let user: User
let list: List

let data: TaskInputData
beforeEach(async () => {
  em = (await getConnection()).em.fork()

  await em.begin()

  user = em.create(User, { id: 'testId', name: 'test testopoulos', email: 'testopoulos@email.com', lists: [] })
  await em.persistAndFlush(user)

  list = em.create(List, { id: 'testListId', slug: 'testSlug', title: 'testList', type: 'fun' as TypeEnum, capacity: 3, tasks: new Collection<Task>(this), owner: user })
  await em.persistAndFlush(list).then(() => {
    // default values for data on tasks
    data = { name: 'testTaskName', type: 'fun' as TypeEnum, done: false, list: list.id }
  })
})

afterEach(async () => {
  await em.rollback()
})

async function createBasicList (slug = `slug_${Math.floor(Math.random() * 9999)}`, type = 'fun', capacity = 4): Promise<List> {
  const list = em.create(List, {
    slug,
    title: 'testListTitle',
    type,
    capacity,
    owner: user
  })

  await em.persistAndFlush(list)

  return list
}

async function createBasicTask (name = `task_${Math.floor(Math.random() * 9999)}`, type = 'fun', list = {}, done = false): Promise<Task> {
  const task = em.create(Task, {
    name,
    type,
    list,
    done
  })

  await em.persistAndFlush(task)

  return task
}

describe('TasksAction: createTaskAction(loggedUser, data)', () => {
  test('Create task with non existent list', async () => {
    expect.assertions(1)

    await expect(async () => await createTaskAction(user, { ...data, list: 'FALSE_LIST_ID' }, em)).rejects.toThrow('not found')
  })

  test('Create task with non existent user', async () => {
    expect.assertions(1)

    const fakeLoggedUser: User = { id: 'FALSE_USER_ID', name: 'FALSE_USER_NAME', email: 'FALSE_USER_EMAIL', lists: new Collection<List>(this) }

    await expect(async () => await createTaskAction(fakeLoggedUser, data, em)).rejects.toThrow('not found')
  })

  test('Create task without being the owner of the list (as an existing user)', async () => {
    expect.assertions(1)

    const newUser = em.create(User, { id: 'newUserId', name: 'new user', email: 'newUser@email.com', lists: new Collection<List>(this) })
    await em.persistAndFlush(newUser)

    await expect(async () => await createTaskAction(newUser, data, em)).rejects.toThrow('Cant create task: This must be your list in order to add tasks to it!')
  })

  test('Create task on a maxed out list', async () => {
    expect.assertions(1)

    // make 3 tasks on a list with capacity: 3
    await createBasicTask('task1', list.type, list)
    await createBasicTask('task2', list.type, list)
    await createBasicTask('task3', list.type, list)

    // add 4th task
    await expect(async () => await createTaskAction(user, data, em)).rejects.toThrow('Cant create task: List capacity is at maximum!')
  })

  test('Create task on with existing name on list', async () => {
    expect.assertions(1)

    await createBasicTask('sameTaskName', list.type, list)

    // same name on 2nd task (unique on list)
    await expect(async () => await createTaskAction(user, { ...data, name: 'sameTaskName' }, em)).rejects.toThrow('Cant create task: Task name already exists in this list!')
  })

  test('Create task on with task.type != list.type', async () => {
    expect.assertions(8)

    // swap the data.type to be different from that of the list.type
    list.type === 'fun' ? data.type = 'work' as TypeEnum : list.type === 'work' ? data.type = 'personal' as TypeEnum : data.type = 'fun' as TypeEnum

    const result = await createTaskAction(user, data, em)

    const lists = await em.find(List, {})

    expect(result).not.toBeNull()
    expect(lists[0].tasks).toHaveLength(1)
    expect(result.id).toBe(lists[0].tasks[0].id)

    expect(result.done).toBe(data.done)
    expect(result.list.id).toBe(data.list)
    expect(result.name).toBe(data.name)

    // result.type isnt the same as data.type
    expect(result.type).toBe(list.type)
    expect(result.type).not.toBe(data.type)
  })

  test('Create task', async () => {
    expect.assertions(8)

    const tasksBeforeCreation = await em.find(Task, {})

    const result = await createTaskAction(user, data, em)

    const tasksAfterCreation = await em.find(Task, {})

    expect(result).not.toBeNull()
    expect(tasksBeforeCreation).toHaveLength(0)
    expect(tasksAfterCreation).toHaveLength(1)
    expect(result.id).toBe(tasksAfterCreation[0].id)

    // all tasks are created based on data (no changes on type)
    expect(result.done).toBe(data.done)
    expect(result.list.id).toBe(data.list)
    expect(result.name).toBe(data.name)
    expect(result.type).toBe(data.type)
  })
})

describe('TasksAction: updateTaskAction(loggedUser, id, data)', () => {
  test('Update task with non existent task id', async () => {
    expect.assertions(1)

    await createBasicTask('task1', list.type, list)

    await expect(async () => await updateTaskAction(user, 'FALSE_TASK_ID', data, em)).rejects.toThrow('not found')
  })

  test('Update task move task to non existent list', async () => {
    expect.assertions(1)

    const t1 = await createBasicTask('task1', list.type, list)

    await expect(async () => await updateTaskAction(user, t1.id, { ...data, list: 'FALSE_LIST_ID' }, em)).rejects.toThrow('not found')
  })

  test('Update task with non existent user, as a logged user', async () => {
    expect.assertions(1)

    const t1 = await createBasicTask('task1', list.type, list)

    const fakeLoggedUser: User = { id: 'FALSE_USER_ID', name: 'FALSE_USER_NAME', email: 'FALSE_USER_EMAIL', lists: new Collection<List>(this) }

    await expect(async () => await updateTaskAction(fakeLoggedUser, t1.id, data, em)).rejects.toThrow('not found')
  })

  test('Update task without being the owner of this task list, as an existing user', async () => {
    expect.assertions(1)

    const t1 = await createBasicTask('task1', list.type, list)

    const newUser = em.create(User, { id: 'newUserId', name: 'new user', email: 'newUser@email.com', lists: new Collection<List>(this) })
    await em.persistAndFlush(newUser)

    await expect(async () => await updateTaskAction(newUser, t1.id, data, em)).rejects.toThrow('Cant update task: This must be your list in order to update a task!')
  })

  test('Update task name with existing name on list', async () => {
    expect.assertions(1)

    const t1 = await createBasicTask('task1', list.type, list)
    const t2 = await createBasicTask('task2', list.type, list)

    // same name on 2nd task (unique on list)
    await expect(async () => await updateTaskAction(user, t2.id, { ...data, name: t1.name }, em)).rejects.toThrow('Cant create task: Task name already exists in this list!')
  })

  test('Update task type', async () => {
    expect.assertions(8)

    const oldTask = await createBasicTask('task', list.type, list, false)

    // swap the data.type to be different from that of the list.type
    list.type === 'fun' ? data.type = 'work' as TypeEnum : list.type === 'work' ? data.type = 'personal' as TypeEnum : data.type = 'fun' as TypeEnum
    const result = await updateTaskAction(user, oldTask.id, data, em)

    const lists = await em.find(List, {})

    expect(result).not.toBeNull()
    expect(lists[0].tasks).toHaveLength(1)
    expect(result.id).toBe(lists[0].tasks[0].id)

    expect(result.done).toBe(data.done)
    expect(result.list.id).toBe(data.list)
    expect(result.name).toBe(data.name)

    // result.type isnt the same as data.type
    expect(result.type).toBe(list.type)
    expect(result.type).not.toBe(data.type)
  })

  // Has a bug
  test('Update task list', async () => {
    expect.assertions(9)

    const t1 = await createBasicTask('task', list.type, list, false)

    // create new list and assign it to the task
    const newList = await createBasicList()
    data.list = newList.id

    const result = await updateTaskAction(user, t1.id, data, em)

    const lists = await em.find(List, {})

    expect(result).not.toBeNull()
    expect(lists[0].tasks).toHaveLength(1) // BUG: should return length 0
    expect(lists[1].tasks).toHaveLength(1)
    expect(result.id).toBe(lists[1].tasks[0].id)

    expect(result.done).toBe(data.done)
    expect(result.name).toBe(data.name)
    expect(result.type).toBe(data.type)

    // result.list isnt the same as t1.list
    expect(result.list.id).toBe(data.list)
    expect(result.list.id).not.toBe(t1.list)
  })

  test('Update task: done and name fields', async () => {
    expect.assertions(9)

    const t1 = await createBasicTask('task', list.type, list, false)
    // keep old values
    const oldName = t1.name
    const oldDone = t1.done

    // new name and swapped done value
    data.done = !t1.done
    data.name = 'updatedTaskName'

    const result = await updateTaskAction(user, t1.id, data, em)

    const lists = await em.find(List, {})

    expect(result).not.toBeNull()
    expect(lists[0].tasks).toHaveLength(1)
    expect(result.id).toBe(lists[0].tasks[0].id)

    expect(result.type).toBe(data.type)
    expect(result.list.id).toBe(data.list)

    // name and done should be changed
    expect(result.done).toEqual(lists[0].tasks[0].done)
    expect(result.done).not.toEqual(oldDone)
    expect(result.name).toEqual(lists[0].tasks[0].name)
    expect(result.name).not.toEqual(oldName)
  })
})

describe('TasksAction: removeTaskAction(loggedUser, id)', () => {
  test('Remove task with non existent list id', async () => {
    expect.assertions(1)

    await createBasicList()

    await expect(async () => await removeTaskAction(user, 'FALSE_TASK_ID', em)).rejects.toThrow('not found')
  })

  test('Remove task with non existent user, as a logged user', async () => {
    expect.assertions(1)

    const t1 = await createBasicTask('task1', list.type, list, false)

    const fakeLoggedUser: User = { id: 'FALSE_USER_ID', name: 'FALSE_USER_NAME', email: 'FALSE_USER_EMAIL', lists: new Collection<List>(this) }

    await expect(async () => await removeTaskAction(fakeLoggedUser, t1.id, em)).rejects.toThrow('not found')
  })

  test('Remove task without being the owner of the list (as an existing user)', async () => {
    expect.assertions(1)

    const t1 = await createBasicTask('task1', list.type, list, false)

    const newUser = em.create(User, { id: 'newUserId', name: 'new user', email: 'newUser@email.com', lists: new Collection<List>(this) })
    await em.persistAndFlush(newUser)

    await expect(async () => await removeTaskAction(newUser, t1.id, em)).rejects.toThrow('Cant remove task: This must be your list in order to remove a task!')
  })

  test('Remove task', async () => {
    expect.assertions(3)

    const t1 = await createBasicTask('task1', list.type, list, false)

    // get all lists before removing the list1
    const listsBeforeRemoveTask = await em.find(List, {})
    const tasksBeforeRemoveTask = listsBeforeRemoveTask[0].tasks.length

    const result = await removeTaskAction(user, t1.id, em)

    // get all lists after removing the list1
    const listsAfterRemoveTask = await em.find(List, {})
    const tasksAfterRemoveTask = listsAfterRemoveTask[0].tasks.length

    expect(result).toBeTruthy()
    expect(tasksBeforeRemoveTask).toBe(1)
    expect(tasksAfterRemoveTask).toBe(0)
  })
})
