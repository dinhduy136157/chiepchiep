# Supabase Security Checklist

This project calls Supabase directly from browser routes. The anon key is public, so every table below must be protected by Row Level Security in Supabase.

## Required table policies

### profiles

- Users can read only public profile fields needed for display/search: `id`, `username`, `avatar_url`.
- Users can update only their own profile row: `id = auth.uid()`.
- Do not expose email through this table.

### study_sets

- Users can select rows where `author_id = auth.uid()`.
- Users can insert rows only with `author_id = auth.uid()`.
- Users can update/delete rows only where `author_id = auth.uid()`.
- Group members may select a study set only when a row exists in `group_study_sets` for a group where they are a member.

### cards

- Users can select/insert/update/delete cards only when the parent `study_sets.author_id = auth.uid()`.
- Group members may select cards for shared study sets, but must not update/delete them unless they own the parent set.

### learning_progress

- Users can select/insert/update/delete only rows where `user_id = auth.uid()`.
- Group progress views should expose aggregate progress to group members without exposing unrelated users' progress.

### groups

- Users can select groups only when they have a matching `group_members.user_id = auth.uid()` row.
- Users can insert groups with `created_by = auth.uid()`.
- Only group owners can update/delete group metadata.

### group_members

- Users can select membership rows only for groups they belong to.
- Only group owners can add/remove members.
- Users must not be able to grant themselves `owner` for an existing group.

### group_study_sets

- Group owners/members can select shared-set rows for groups they belong to.
- Only the study set owner or group owner can insert rows.
- Only the study set owner or group owner can delete rows.

### UserStreaks

- Users can select/insert/update only rows where `UserId = auth.uid()`.

## Recommended database interfaces

Create RPCs/views for data that currently requires broad nested reads:

- `study_sets_with_card_counts(user_id)` returns set metadata plus `card_count`.
- `group_set_progress(group_id)` returns `{ set_id, user_id, mastered_count, total_count }` only for members of that group.
- `search_profiles(query, limit)` returns only public profile fields and enforces a limit.

## Verification

Before release, test every policy with two real users:

- User A cannot open User B's private set by changing `/dashboard/set/[id]`.
- User A cannot delete cards from User B's set.
- Group member can read a shared set, but cannot mutate it unless they own it.
- Non-member cannot read group detail, members, shared sets, or group progress.
- User A cannot write `learning_progress` rows for User B.
