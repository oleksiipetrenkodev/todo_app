const users = [
  { id: 'u1', email: 'oleksii@example.com', password: 'oleksii' },
  { id: 'u2', email: 'ivan@example.com', password: 'ivan' },
];

export const fakeDB = {
  getUserById: (id) => {
    const user = users.find((user) => user.id === id);
    return user;
  },
  getAllUsers: () => users,
};
