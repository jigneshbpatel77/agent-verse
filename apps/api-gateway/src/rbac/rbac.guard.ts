import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // TODO: enforce role and permission policies.
    void context;
    return true;
  }
}
