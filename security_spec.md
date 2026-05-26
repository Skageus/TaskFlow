# security_spec.md

## Data Invariants
- A Todo must belong to a existing User (parent document).
- A user can only read and write their own documents.
- `updatedAt` must be a valid ISO string.

## The "Dirty Dozen" Payloads
1. Attempt to create a user with someone else's ID.
2. Attempt to update a user's `email` (immutable).
3. Attempt to create a todo under another user's path.
4. Attempt to read todos of another user.
5. Attempt to update a todo of another user.
6. Attempt to delete a todo of another user.
7. Attempt to bypass `isValidTodo` by sending a 1MB string for `text`.
8. Attempt to send `completed` as a string instead of boolean.
9. Attempt to update `userId` of a todo (immutable).
10. Attempt to inject extra fields into a todo document (shadow fields).
11. Attempt to create a todo with an invalid ID format.
12. Attempt to list all todos without specifying a userId.

## The Test Runner (Conceptual)
All payloads above should return PERMISSION_DENIED.
