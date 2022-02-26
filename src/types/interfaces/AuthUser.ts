export interface AuthUser {
  sub: string

  id: string

  azp: string

  resource_access: {
    [key: string]: {
      roles: string[]
    }
  }

  scope: string

  email: string

  name: string

  preferred_username: string
}
