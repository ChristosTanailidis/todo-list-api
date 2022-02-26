import { Collection, Entity, Enum, ManyToOne, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { Field, ID, ObjectType } from 'type-graphql'
import { v4 } from 'uuid'
import TypeEnum from '../enums/TypeEnum'
import { Task } from './Task'
import { User } from './User'

@Entity()
@ObjectType()
export class List {
  @PrimaryKey()
  @Field(() => ID)
  id: string = v4()

  @Property()
  @Field()
  @Unique()
  slug!: string

  @Property()
  @Field()
  title: string

  @Field(() => TypeEnum)
  @Enum(() => TypeEnum)
  type: TypeEnum

  @Property()
  @Field()
  capacity!: number

  @OneToMany(() => Task, task => task.list)
  @Field(() => [Task])
  tasks = new Collection<Task>(this)

  @ManyToOne(() => User)
  @Field(() => User)
  owner!: User
}
