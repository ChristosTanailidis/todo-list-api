import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { Field, ID, ObjectType } from 'type-graphql'
import { v4 } from 'uuid'
import TypeEnum from '../enums/TypeEnum'
import { List } from './List'

@Entity()
@ObjectType()
export class Task {
  @PrimaryKey()
  @Field(() => ID)
  id: string = v4()

  @Property()
  @Field()
  name: string // todo unique per list

  @Field(() => TypeEnum)
  @Enum(() => TypeEnum)
  type: TypeEnum

  @Property()
  @Field()
  done: false

  @ManyToOne(() => List)
  @Field(() => List)
  list!: List
}
