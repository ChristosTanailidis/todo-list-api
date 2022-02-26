import '../dbSetup'
import { Collection, EntityManager } from '@mikro-orm/core'
import { getConnection } from '../createConnection'
import { List } from 'src/types/entities/List'
import { createListAction, getCompletedListsAction, getListAction, getListsAction, removeListAction, updateListAction } from 'src/lib/actions/ListActions'
import { User } from 'src/types/entities/User'
import { Task } from 'src/types/entities/Task'
import { ListInputData } from 'src/types/classes/ListInputData'
import TypeEnum from 'src/types/enums/TypeEnum'

let em: EntityManager
let user: User
let data: ListInputData
beforeEach(async () => {
  em = (await getConnection()).em.fork()

  await em.begin()

  user = await em.create(User, { id: 'testId', name: 'test testopoulos', email: 'testopoulos@email.com', lists: [] })
  await em.persistAndFlush(user)

  // List data with default values on type: 'fun' and capacity: 4, also user is test testopoulos
  data = { slug: 'list_x', title: 'listX', type: 'fun' as TypeEnum, capacity: 4, owner: user.id }
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

// getListsAction
describe('ListsAction: getListsAction()', () => {
  test('Empty', async () => {
    expect.assertions(1)

    const result = await getListsAction(em)

    expect(result).toHaveLength(0)
  })

  test('return all', async () => {
    expect.assertions(3)

    const l1 = await createBasicList()
    await createBasicList('slug2', 'work', 6)
    await createBasicList('slug3', 'fun')
    const l2 = await createBasicList()

    const result = await getListsAction(em)

    expect(result).toHaveLength(4)
    expect(result[0]).toBe(l1)
    expect(result[3]).toBe(l2)
  })
})

// getListAction (one item)
describe('ListsAction: getListAction(id)', () => {
  test('Non existent list', async () => {
    expect.assertions(1)

    await createBasicList()

    await expect(async () => await getListAction('FALSE_ID', em)).rejects.toThrow('not found')
  })

  test('Get existing list', async () => {
    expect.assertions(3)

    const l1 = await createBasicList('slug1', 'fun', 5)
    const l2 = await createBasicList('slug2', 'work', 6)
    const l3 = await createBasicList('slug3', 'personal', 5)

    let result = await getListAction(l1.id, em)
    expect(result).toBe(l1)

    result = await getListAction(l2.id, em)
    expect(result).toBe(l2)

    result = await getListAction(l3.id, em)
    expect(result).toBe(l3)
  })
})

// getCompletedLists
describe('ListsAction: getCompletedListsAction()', () => {
  test('Empty lists', async () => {
    expect.assertions(1)

    const result = await getCompletedListsAction(em) // getCompletedLists with no lists

    expect(result).toHaveLength(0)
  })

  test('Empty completed lists', async () => {
    expect.assertions(1)

    await createBasicList() // empty list with no tasks

    const result = await getCompletedListsAction(em) // getCompletedLists with no lists

    expect(result).toHaveLength(0)
  })

  test('List with uncompleted tasks', async () => {
    expect.assertions(1)

    const l1 = await createBasicList() // empty list with no tasks

    await createBasicTask('task1', l1.type, l1, false)

    const result = await getCompletedListsAction(em) // getCompletedLists with no lists

    expect(result).toHaveLength(0)
  })

  test('Return all completed lists', async () => {
    expect.assertions(8)

    await createBasicList() // will be empty
    const l2 = await createBasicList('list_2', 'work') // will have 2/2 completed
    const l3 = await createBasicList('list_3', 'personal') // will have 1/1 completed
    const l4 = await createBasicList() // will have 0/1 completed

    const t1 = await createBasicTask('task1', l2.type, l2, true)
    const t2 = await createBasicTask('task2', l2.type, l2, true)
    const t3 = await createBasicTask('task3', l3.type, l3, true)
    await createBasicTask('task4', l4.type, l4, false)

    const result = await getCompletedListsAction(em)

    expect(result).toHaveLength(2) // 2/4 lists are completed

    expect(result[0].id).toBe(l2.id) // first result must be list2
    expect(result[0].tasks).toHaveLength(2) // list2 has 2/2 completed tasks
    expect(result[0].tasks[0].id).toBe(t1.id) // first task in list2 must be task1
    expect(result[0].tasks[1].id).toBe(t2.id) // second task in list2 must be task2

    expect(result[1].id).toBe(l3.id) // second result must be list3
    expect(result[1].tasks).toHaveLength(1) // list3 has 1/1 completed tasks
    expect(result[1].tasks[0].id).toBe(t3.id) // first task in list3 must be task3
  })
})

// List creation
describe('ListsAction: createListAction(loggedUser, data)', () => {
  test('Create list with non existent user', async () => {
    expect.assertions(1)

    const fakeLoggedUser: User = { id: 'FALSE_USER_ID', name: 'FALSE_USER_NAME', email: 'FALSE_USER_EMAIL', lists: new Collection<List>(this) }

    await expect(async () => await createListAction(fakeLoggedUser, data, em)).rejects.toThrow('not found')
  })

  test('Create list with existing slug', async () => {
    expect.assertions(1)
    em.create(User, user)

    await createBasicList('sameSlug')

    await expect(async () => await createListAction(user, { ...data, slug: 'sameSlug' }, em)).rejects.toThrow()
  })

  test('Create list', async () => {
    expect.assertions(6)

    const result = await createListAction(user, data, em)

    expect(result).not.toBeNull()

    expect(result.title).toBe(data.title)
    expect(result.type).toBe(data.type)
    expect(result.capacity).toBe(data.capacity)
    expect(result.owner.id).toBe(data.owner)
    expect(result.slug).toBe(data.slug)
  })
})

// List updates
describe('ListsAction: updateListAction(loggedUser, data)', () => {
  test('Update list with non existent list id', async () => {
    expect.assertions(1)

    await createBasicList()

    await expect(async () => await updateListAction(user, 'FALSE_LIST_ID', data, em)).rejects.toThrow('not found')
  })

  test('Update list with non existent user, as a logged user', async () => {
    expect.assertions(1)

    const l1 = await createBasicList()

    const fakeLoggedUser: User = { id: 'FALSE_USER_ID', name: 'FALSE_USER_NAME', email: 'FALSE_USER_EMAIL', lists: new Collection<List>(this) }

    await expect(async () => await updateListAction(fakeLoggedUser, l1.id, data, em)).rejects.toThrow('not found')
  })

  test('Update list without being the owner of the list, as an existing user', async () => {
    expect.assertions(1)

    const l1 = await createBasicList()

    const newUser = em.create(User, { id: 'newUserId', name: 'new user', email: 'newUser@email.com', lists: new Collection<List>(this) })
    await em.persistAndFlush(newUser)

    await expect(async () => await updateListAction(newUser, l1.id, data, em)).rejects.toThrow('Cant update list: This must be your list in order to change it')
  })

  test('Update on list.owner should throw error', async () => {
    expect.assertions(1)

    const l1 = await createBasicList()

    const newUser = em.create(User, { id: 'newUserId', name: 'new user', email: 'newUser@email.com', lists: new Collection<List>(this) })
    await em.persistAndFlush(newUser)

    await expect(async () => await updateListAction(user, l1.id, { ...data, owner: newUser.id }, em)).rejects.toThrow('Cant update list: Owner cant be updated')
  })

  test('Update list and check if capacity or type is changed', async () => {
    expect.assertions(8)

    const l1 = await createBasicList()

    // swap the data.type to be different from that of the list.type
    l1.type === 'fun' ? data.type = 'work' as TypeEnum : l1.type === 'work' ? data.type = 'personal' as TypeEnum : data.type = 'fun' as TypeEnum
    // add 1 on data.capacity to be different from that of list.capacity
    data.capacity++
    const result = await updateListAction(user, l1.id, data, em)

    expect(result).not.toBeNull()

    expect(result.title).toBe(data.title)
    expect(result.slug).toBe(data.slug)
    expect(result.owner.id).toBe(data.owner)

    // checking if type changed
    expect(result.type).toBe(l1.type)
    expect(result.type).not.toBe(data.type)

    // checking if capacity changed
    expect(result.capacity).toEqual(l1.capacity)
    expect(result.capacity).not.toEqual(data.capacity)
  })

  test('Update list', async () => {
    expect.assertions(6)

    const l1 = await createBasicList()

    const result = await updateListAction(user, l1.id, { ...data, type: l1.type, capacity: l1.capacity }, em)

    expect(result).not.toBeNull()

    // all changes are based on the data values
    expect(result.title).toBe(data.title)
    expect(result.slug).toBe(data.slug)
    expect(result.owner.id).toBe(data.owner)
    expect(result.type).toBe(data.type)
    expect(result.capacity).toEqual(data.capacity)
  })
})

// List removal
describe('ListsAction: removeListAction(loggedUser, id)', () => {
  test('Remove list with non existent list id', async () => {
    expect.assertions(1)

    await createBasicList()

    await expect(async () => await removeListAction(user, 'FALSE_LIST_ID', em)).rejects.toThrow('not found')
  })
  test('Remove list with non existent user, as a logged user', async () => {
    expect.assertions(1)

    const l1 = await createBasicList()

    const fakeLoggedUser: User = { id: 'FALSE_USER_ID', name: 'FALSE_USER_NAME', email: 'FALSE_USER_EMAIL', lists: new Collection<List>(this) }

    await expect(async () => await removeListAction(fakeLoggedUser, l1.id, em)).rejects.toThrow('not found')
  })

  test('Remove list without being the owner of the list, as an existing user', async () => {
    expect.assertions(1)

    const l1 = await createBasicList()

    const newUser = em.create(User, { id: 'newUserId', name: 'new user', email: 'newUser@email.com', lists: new Collection<List>(this) })
    await em.persistAndFlush(newUser)

    await expect(async () => await removeListAction(newUser, l1.id, em)).rejects.toThrow('Cant remove list: This must be your list in order to remove it')
  })

  test('Remove list', async () => {
    expect.assertions(3)

    const l1 = await createBasicList()

    // get all lists before removing the list1
    const listsBeforeRemoveList = await em.find(List, {})

    const result = await removeListAction(user, l1.id, em)

    // get all lists after removing the list1
    const listsAfterRemoveList = await em.find(List, {})

    expect(result).toBeTruthy()
    expect(listsBeforeRemoveList).toHaveLength(1)
    expect(listsAfterRemoveList).toHaveLength(0)
  })
})

// todo testing on clone
