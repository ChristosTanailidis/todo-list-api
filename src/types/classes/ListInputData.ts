import { IsEnum, IsNumber, IsString, Matches } from 'class-validator'
import { Field, InputType } from 'type-graphql'
import TypeEnum from '../enums/TypeEnum'

@InputType()
export class ListInputData {
  @Field()
  @Matches(/^[a-zA-Z0-9-_]\w{2,24}$/, { message: 'a valid slug has only numbers, letters and underscores' })
  slug: string

  @Field()
  @IsString()
  title: string

  @Field(() => TypeEnum)
  @IsEnum(TypeEnum)
  type: TypeEnum

  @Field()
  @IsNumber()
  capacity: number

  @Field()
  @IsString()
  owner: string
}
