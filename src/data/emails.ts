import type { Email } from './types';

const now = new Date();

export const demoEmails: Email[] = [
  {
    id: '1',
    from: 'Academic Section',
    fromEmail: 'academic@iitd.ac.in',
    subject: 'End Semester Exam Schedule Released - Semester Autumn 2026',
    body: `Dear Students,

The end semester examination schedule for Autumn 2026 has been released. Please check the attached timetable for your respective courses.

Key dates:
- Examinations begin: November 15, 2026
- Last examination: December 3, 2026
- Result declaration: December 20, 2026

Please note that the examination centre for all courses will be the respective department classrooms unless otherwise specified.

For any discrepancies, contact the Academic Section within 48 hours.

Regards,
Academic Section, IIT Delhi`,
    timestamp: new Date(now.getTime() - 12 * 60000),
    folder: 'inbox',
    read: false,
    starred: true,
    category: 'course',
    hasAttachment: true,
    labels: ['Academic', 'Exam Schedule'],
  },
  {
    id: '2',
    from: 'Dr. Anil Kumar',
    fromEmail: 'anilkumar@iitd.ac.in',
    subject: 'Project Meeting Rescheduled to Thursday 3 PM',
    body: `Hi Siddhant,

Due to a conflict with the department review meeting, I need to reschedule our project discussion to Thursday at 3 PM in my office (MS-312).

Please come prepared with:
1. Progress on the literature review
2. Updated timeline for the next milestone
3. Any blockers you're facing

Looking forward to the discussion.

Best,
Dr. Anil Kumar
Associate Professor, CSE`,
    timestamp: new Date(now.getTime() - 47 * 60000),
    folder: 'inbox',
    read: false,
    starred: false,
    category: 'research',
  },
  {
    id: '3',
    from: 'Bharti Apartments HC',
    fromEmail: 'hostel-hc@iitd.ac.in',
    subject: 'Hostel Mess Menu for the Week (Sept 14-20)',
    body: `Dear Residents,

Please find the mess menu for the upcoming week. We have introduced some new items based on your feedback.

Special notices:
- Water supply will be suspended on Sept 16, 10 AM - 2 PM for pipeline maintenance
- Inter-hostel basketball match on Sept 17 at 4 PM
- Fresher's welcome dinner on Sept 20, 7 PM at the mess hall

Please collect your mess coupons from the caretaker's office before 5 PM today.

Regards,
Hostel Caretaker`,
    timestamp: new Date(now.getTime() - 2 * 3600000),
    folder: 'inbox',
    read: true,
    starred: false,
    category: 'hostel',
  },
  {
    id: '4',
    from: 'CSE Department',
    fromEmail: 'cse.dept@iitd.ac.in',
    subject: 'Seminar: Large Language Models in Software Engineering',
    body: `Dear Faculty and Students,

The Department of Computer Science and Engineering invites you to a seminar by Prof. Martin Vechev (ETH Zurich) on "Large Language Models in Software Engineering: Opportunities and Challenges."

Date: September 18, 2026
Time: 4:00 PM
Venue: Lecture Hall Complex - I

All are welcome to attend.

Department of CSE`,
    timestamp: new Date(now.getTime() - 5 * 3600000),
    folder: 'inbox',
    read: true,
    starred: true,
    category: 'course',
  },
  {
    id: '5',
    from: 'IIT Delhi Finance Office',
    fromEmail: 'finance@iitd.ac.in',
    subject: 'Fee Payment Reminder - Semester 1, 2026-27',
    body: `Dear Student,

This is a reminder that the semester fee payment for Semester 1, 2026-27 is due by September 30, 2026.

Please log in to the student portal to make the payment. Late payment will attract a penalty of Rs. 500 per week.

For any queries, contact the Finance Office.

Office of Finance,
IIT Delhi`,
    timestamp: new Date(now.getTime() - 24 * 3600000),
    folder: 'inbox',
    read: true,
    starred: false,
    category: 'admin',
  },
  {
    id: '6',
    from: 'Placement Cell',
    fromEmail: 'placement@iitd.ac.in',
    subject: 'Pre-Placement Talk - Google - Sept 15, 10 AM',
    body: `Dear Students,

Google will be visiting campus for placements on September 20. A pre-placement talk is scheduled for:

Date: September 15, 2026
Time: 10:00 AM
Venue: Audi 2

Eligible students (CGPA >= 7.5) should register on the placement portal by September 14.

Regards,
Placement Cell`,
    timestamp: new Date(now.getTime() - 26 * 3600000),
    folder: 'inbox',
    read: true,
    starred: false,
    category: 'admin',
  },
];
