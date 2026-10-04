export type DomainErrorCode =
  | 'empty_title'
  | 'not_tickable'
  | 'not_movable'
  | 'invalid_move_date'
  | 'cannot_restore'
  | 'undecided_tasks';

export class DomainError extends Error {
  constructor(
    public code: DomainErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'DomainError';
  }
}
