import db from '../config/database.js';

const seedForumData = async () => {
  try {
    console.log('🌱 Seeding forum with dummy data...');

    // Get student and faculty users
    const [[studentUser]] = await db.query(
      `SELECT id FROM users WHERE role = 'student' LIMIT 1`
    );
    
    const [[facultyUser]] = await db.query(
      `SELECT id FROM users WHERE role = 'faculty' LIMIT 1`
    );

    if (!studentUser || !facultyUser) {
      console.log('⚠️  No student or faculty users found. Run main seed script first.');
      process.exit(1);
    }

    const studentId = studentUser.id;
    const facultyId = facultyUser.id;

    // Insert dummy questions
    console.log(`\n📝 Creating forum questions...`);

    const questions = [
      {
        title: 'How to solve quadratic equations efficiently?',
        text: 'I\'m struggling with solving quadratic equations. Can someone explain the methods like factoring, completing the square, and the quadratic formula? Which one is most efficient for competitive exams?',
        tags: ['mathematics', 'algebra', 'exam-prep']
      },
      {
        title: 'Best practices for Python coding?',
        text: 'What are the best practices for writing clean and efficient Python code? I want to improve my coding skills before the programming competition.',
        tags: ['python', 'programming', 'coding']
      },
      {
        title: 'How to prepare for JEE Main?',
        text: 'I am in 11th grade and want to start preparing for JEE Main. What should be my strategy? Which subjects should I focus on first?',
        tags: ['exam-prep', 'career', 'jee']
      },
      {
        title: 'Understanding Newton\'s Laws of Motion',
        text: 'Can someone explain Newton\'s three laws of motion with real-world examples? I find the concepts confusing and need clarity.',
        tags: ['physics', 'mechanics', 'homework']
      },
      {
        title: 'How to write a good essay for English assignments?',
        text: 'I struggle with essay writing. How should I structure an essay? What techniques can I use to improve my writing skills?',
        tags: ['english', 'writing', 'homework']
      },
      {
        title: 'When will the next school event be scheduled?',
        text: 'Can the administration provide information about upcoming school events, sports competitions, and cultural programs? Where can we find the event calendar?',
        tags: ['events', 'announcements', 'school']
      },
      {
        title: 'How to collaborate on group projects effectively?',
        text: 'We have a group science project coming up. What\'s the best way to divide work and collaborate with team members to get the best results?',
        tags: ['projects', 'collaboration', 'teamwork']
      },
      {
        title: 'Study tips for history and social studies?',
        text: 'History has so much information to memorize. How do you suggest approaching history and social studies to remember key facts and dates?',
        tags: ['history', 'study-tips', 'subjects']
      }
    ];

    const questionIds = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const authorId = i % 2 === 0 ? studentId : facultyId;
      
      const [result] = await db.query(
        `INSERT INTO forum_questions (author_user_id, title, question_text, interest_tags, replies_count)
         VALUES (?, ?, ?, ?, 0)`,
        [authorId, q.title, q.text, JSON.stringify(q.tags)]
      );

      questionIds.push(result.insertId);
      console.log(`✅ Question created: "${q.title}"`);
    }

    // Insert dummy replies
    console.log(`\n💬 Creating forum replies...`);

    const replies = [
      {
        questionIdx: 0,
        authorId: facultyId,
        text: 'Great question! The quadratic formula is the most reliable method. You can use it for any quadratic equation: x = (-b ± √(b²-4ac)) / 2a. Practice with different problems to master this.'
      },
      {
        questionIdx: 0,
        authorId: studentId,
        text: 'I found that factoring is the quickest when the roots are rational numbers. But the quadratic formula always works!'
      },
      {
        questionIdx: 1,
        authorId: facultyId,
        text: 'Here are some key practices:\n1. Follow PEP 8 style guide\n2. Use meaningful variable names\n3. Avoid deep nesting\n4. Write docstrings\n5. Use list comprehensions\nWould you like examples for any of these?'
      },
      {
        questionIdx: 2,
        authorId: facultyId,
        text: 'JEE Main preparation requires a 2-year strategic plan. Focus on:\n- Physics: Mechanics, Thermodynamics\n- Chemistry: Physical, Organic\n- Mathematics: Calculus, Coordinate Geometry\nStart with NCERT books and then move to advanced materials.'
      },
      {
        questionIdx: 3,
        authorId: facultyId,
        text: 'Newton\'s First Law: An object at rest stays at rest unless acted upon. Example: A car moving at constant speed will continue unless brakes are applied.\n\nSecond Law: Force = Mass × Acceleration. Heavier objects need more force to accelerate.\n\nThird Law: For every action, there\'s an equal and opposite reaction. Jumping pushes you up because you push the ground down.'
      },
      {
        questionIdx: 4,
        authorId: studentId,
        text: 'Essay structure should be:\n1. Introduction with thesis statement\n2. Body paragraphs with evidence\n3. Conclusion summarizing key points\nUse transitions between paragraphs to improve flow.'
      },
      {
        questionIdx: 5,
        authorId: facultyId,
        text: 'The school calendar is updated regularly. Please check the school portal or notice board for upcoming events. We have sports day in May and annual fest in June!'
      },
      {
        questionIdx: 6,
        authorId: facultyId,
        text: 'Use a project management tool like Trello or Google Docs for tracking progress. Divide tasks based on individual strengths and set clear deadlines for milestones.'
      }
    ];

    for (const reply of replies) {
      const questionId = questionIds[reply.questionIdx];
      
      await db.query(
        `INSERT INTO forum_replies (question_id, author_user_id, reply_text, parent_reply_id)
         VALUES (?, ?, ?, NULL)`,
        [questionId, reply.authorId, reply.text]
      );

      // Update replies count
      await db.query(
        `UPDATE forum_questions SET replies_count = replies_count + 1 WHERE id = ?`,
        [questionId]
      );

      console.log(`✅ Reply added to question`);
    }

    console.log('\n✅ Forum data seeded successfully!');
    console.log(`Total Questions: ${questionIds.length}`);
    console.log(`Total Replies: ${replies.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding forum data:', error);
    process.exit(1);
  }
};

seedForumData();
