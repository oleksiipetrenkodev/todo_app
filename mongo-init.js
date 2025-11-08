db = db.getSiblingDB('todo_app');

db.createUser({
  user: 'todo_user',
  pwd: '1',
  roles: [{ role: 'readWrite', db: 'todo_app' }],
});
