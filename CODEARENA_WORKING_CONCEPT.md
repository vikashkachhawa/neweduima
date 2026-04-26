# CodeArena Module: Working and Concept

## 1. What CodeArena Is
CodeArena is a live coding room system inside Eduima where faculty can create coding challenges, invite students, run timed sessions, and evaluate submissions automatically.

The core concept is:
- A room is the container for one coding session.
- Problems are added inside the room.
- Each problem has evaluation test cases.
- Students join the room and submit code.
- The platform runs code against test cases and returns results.

## 2. Main Roles

### Faculty / School Admin
- Creates and manages coding rooms.
- Adds problems with sample input/output and evaluation test cases.
- Invites students.
- Starts and ends the room.
- Watches live participation and progress.

### Student
- Joins a room (usually by invite or access permission).
- Reads the problem.
- Writes and runs code.
- Submits final solution.

### Super Admin
- Has high-level visibility and can access across schools (based on platform access rules).

## 3. Core Objects in the Module

### Room
A room controls session state:
- Draft: preparation stage.
- Active: students can attempt and submit.
- Ended: session is closed.

A room also stores metadata such as title, mode, timings, and invite code.

### Problem
Each room can have multiple problems. A problem includes:
- Title
- Description
- Difficulty
- Constraints
- Student-visible sample input/output

### Test Case
Each test case is one full evaluation run of the student program.
Important concept:
- If a program expects multiple inputs, all required input values must be included inside one test case input.
- Hidden test cases are used for grading but not shown to students.

### Submission
A submission stores student solution details and evaluation outcome.
Typical outcomes include accepted, wrong answer, runtime error, or timeout.

## 4. End-to-End Flow

### Step 1: Room Setup
Faculty creates a room in draft state.

### Step 2: Problem Authoring
Faculty adds one or more problems and attaches test cases for evaluation.

### Step 3: Student Access
Students are invited and linked as participants.

### Step 4: Session Starts
Faculty starts the room. The room becomes active.

### Step 5: Student Coding
Students write code and may run code with custom input for practice.

### Step 6: Submission and Evaluation
On submit:
- The platform compiles/runs the code in an isolated temp execution environment.
- Input from each test case is fed to the program.
- Actual output is compared with expected output.
- Result is computed per test case and overall.

### Step 7: Live Monitoring
Faculty can track participants, attempts, solved counts, and room-level progress.

### Step 8: Session End
Faculty ends the room; further submissions are blocked as per policy.

## 5. Evaluation Concept (How Grading Works)
- Test cases are processed in sequence.
- Execution is time-limited to avoid infinite loops or abuse.
- Outputs are normalized and compared with expected values.
- Runtime failures, timeouts, and mismatches are recorded clearly.
- Aggregate status decides final submission result.

Key idea:
CodeArena validates program correctness by behavior, not by code style.

## 6. Real-Time Concept
CodeArena includes real-time communication for interactive features and live updates:
- Session-level updates
- Execution stream/output events
- Participant status changes

This gives students immediate feedback and helps faculty monitor activity during live sessions.

## 7. Security and Isolation Concept
To safely run untrusted student code, the module uses guarded execution design:
- Temporary execution workspace
- Language and process controls
- Time and output limits
- Cleanup after execution

This protects the server while still allowing practical coding evaluation.

## 8. Multi-Tenant Concept
Eduima is school-based (tenant-aware). CodeArena follows this model:
- School users access school-specific rooms.
- Access checks enforce ownership/participation rules.
- Elevated platform roles can have broader access depending on role policy.

## 9. Why This Design Works
- Structured lifecycle: draft -> active -> ended
- Separation of visible examples vs hidden evaluation tests
- Automated, repeatable grading
- Live monitoring for faculty
- Safe execution boundaries for student code

This combination makes CodeArena suitable for classroom exercises, coding tests, and timed practice contests.
