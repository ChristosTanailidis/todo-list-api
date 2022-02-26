import { Cascade, Collection, Entity, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { Field, ID, ObjectType } from 'type-graphql'
import { List } from './List'

@Entity()
@ObjectType()
export class User {
  @PrimaryKey()
  @Field(() => ID)
  id: string

  @Property()
  @Field()
  name: string

  @Property()
  @Unique()
  @Field()
  email: string

  @OneToMany(() => List, list => list.owner, { cascade: [Cascade.REMOVE] })
  @Field(() => [List])
  lists = new Collection<List>(this)
}
