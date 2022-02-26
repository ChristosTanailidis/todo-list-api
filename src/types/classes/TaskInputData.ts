import { IsBoolean, IsEnum, IsString } from 'class-validator'
import { Field, InputType } from 'type-graphql'
import TypeEnum from '../enums/TypeEnum'

@InputType()
export class TaskInputData {
  @Field()
  @IsString()
  name: string

  @Field(() => TypeEnum)
  @IsEnum(TypeEnum)
  type: TypeEnum

  @Field()
  @IsString()
  list: string

  @Field()
  @IsBoolean()
  done: boolean
}
