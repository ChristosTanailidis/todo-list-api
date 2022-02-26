import { registerEnumType } from 'type-graphql'

enum TypeEnum {
  work = 'work',
  personal = 'personal',
  fun = 'fun'
}

registerEnumType(TypeEnum, {
  name: 'Type' // this one is mandatory
})

export default TypeEnum
