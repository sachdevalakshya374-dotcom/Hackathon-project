# Test Credentials — LearnFlow AI

Any freshly signed-up account works. Testing agent can use these known ones (if seeded during test) or create new ones via `/api/auth/signup`.

## Suggested Test Student
- Email: stu1@test.com
- Password: pass1234
- Role: student

## Suggested Test Teacher (create via signup)
- Email: teach1@test.com
- Password: pass1234
- Role: teacher

Auth: JWT via POST /api/auth/signup and POST /api/auth/login. Emails stored lowercase.
