import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // TODO: validate JWT and attach principal to request.
    void context;
    return true;
  }
}
