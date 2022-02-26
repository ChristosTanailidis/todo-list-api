import KoaJwt from 'koa-jwt'
import { koaJwtSecret } from 'jwks-rsa'

export const jwt = KoaJwt({
  secret: koaJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: ''
  }),
  algorithms: [''],
  issuer: '',
  passthrough: false
})
