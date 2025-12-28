import { Task } from './models/tasks.js';
import { closeDb, connectToDb } from './db.js';

(async () => {
  try {
    await connectToDb();
    console.log('✅ Connected to MongoDB');

    function randomDateWithinFourYears() {
      const now = new Date();
      const from = new Date();
      from.setFullYear(now.getFullYear() - 20);

      return new Date(from.getTime() + Math.random() * (now.getTime() - from.getTime()));
    }

    const titles = [
      'Implement user authentication',
      'Fix layout issues on mobile',
      'Add analytics tracking',
      'Create password reset flow',
      'Optimize database queries',
      'Improve loading performance',
      'Add search filtering',
      'Refactor legacy components',
      'Write unit tests',
      'Design new dashboard UI',
      'Implement email notifications',
      'Integrate payment system',
      'Migrate to TypeScript',
      'Fix race condition in API',
      'Add dark mode support',
      'Improve error handling',
      'Build admin panel',
      'Add localization support',
      'Set up CI/CD pipeline',
      'Document API endpoints',
    ];

    const descriptions = [
      'This task requires careful attention to edge cases.',
      'Ensure backwards compatibility with older versions.',
      'Coordinate with the design team before implementation.',
      'Performance improvements are critical here.',
      'Follow coding standards and ensure test coverage.',
      'Make sure to handle all error scenarios properly.',
      'This feature should support mobile and desktop layouts.',
      'Refactor codebase to make future changes easier.',
      'Verify functionality across all supported browsers.',
      'Collaborate with backend team for API adjustments.',
    ];

    function randomItem(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }

    const tokenize = (title) =>
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const tasks = Array.from({ length: 250 }).map((_, i) => {
      const createdAt = randomDateWithinFourYears();
      const title = randomItem(titles) + ` (#${i + 1})`;

      return {
        title,
        titleTokens: tokenize(title),
        description: randomItem(descriptions),
        completed: Math.random() > 0.5,
        createdAt,
        updatedAt: createdAt,
      };
    });

    await Task.insertMany(tasks);

    console.log(`✅✅✅ ${tasks.length} tasks generated`);
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
    process.exit(1);
  } finally {
    await closeDb();
    process.exit(0);
  }
})();
