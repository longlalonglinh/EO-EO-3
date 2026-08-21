import { Exam } from '../types';

export const DEFAULT_EXAMS: Exam[] = [
  {
    exam_code: 'TEST01',
    title: 'IELTS Academic Official Test 01 (L, R, W)',
    test_type: 'TEST',
    duration_mins: 120,
    audio_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=english-conversation-11823.mp3',
    audio_title: 'IELTS Listening Part 1 - 4 Comprehensive Audio Stream',
    reading_passage_title: 'Passage 1: The History and Evolution of Renewable Energy Technologies',
    reading_passage: `Paragraph A
For centuries, human civilization relied almost exclusively on wood, wind, and water power to drive mills, pump water, and navigate the seas. However, the Industrial Revolution ushered in an era dominated by fossil fuels—coal, oil, and natural gas. While coal and oil fueled rapid technological advancements and economic growth, they also introduced severe environmental degradation and greenhouse gas emissions.

Paragraph B
In the mid-20th century, scientists began sounding alarm bells regarding resource depletion and atmospheric pollution. Early photovoltaic (PV) solar cells were developed in 1954 at Bell Labs, initially operating at a modest 6% efficiency. Simultaneously, modern wind turbines gained traction in Denmark and California during the 1970s oil crises. These early innovations laid the groundwork for today's high-efficiency silicon PV modules and offshore wind farms with capacities exceeding 15 megawatts per turbine.

Paragraph C
Despite technological progress, widespread adoption faced economic hurdles. Until the 2010s, generating electricity from solar panels remained far more costly than burning natural gas or coal. Government subsidies, tax incentives, and feed-in tariffs in countries like Germany and China drastically expanded manufacturing scale. As production scaled up globally, the levelized cost of energy (LCOE) for solar energy plummeted by nearly 85% between 2010 and 2020.

Paragraph D
One of the most pressing challenges remaining for renewable systems is grid integration and energy intermittency. Solar energy is unavailable at night, and wind generation varies with weather patterns. To overcome this limitation, advanced lithium-ion battery energy storage systems (BESS) and green hydrogen generation are being deployed worldwide to smooth out power supply and ensure grid stability.`,
    writing_task1_prompt: 'The chart below shows the total global renewable energy investment (in billion USD) and capacity addition between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    writing_task1_image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80',
    writing_task2_prompt: 'Some people believe that government funding should be devoted exclusively to renewable energy development, while others argue that fossil fuels should continue to receive subsidies to maintain low energy prices for low-income households. Discuss both views and give your own opinion. (Write at least 250 words)',
    questions: [
      // LISTENING QUESTIONS
      {
        question_id: 'L1',
        section: 'listening',
        question_text: '1. What is the main purpose of the visitor\'s inquiry at the student information center?',
        question_type: 'multiple_choice',
        options: [
          'A. To register for a university accommodation placement',
          'B. To request a course transfer to the engineering department',
          'C. To inquire about campus library opening hours and memberships'
        ],
        correct_answer: 'A',
        max_score: 1
      },
      {
        question_id: 'L2',
        section: 'listening',
        question_text: '2. What is the maximum contract duration for university student flats?',
        question_type: 'fill_in_blank',
        correct_answer: '12 MONTHS',
        max_score: 1
      },
      {
        question_id: 'L3',
        section: 'listening',
        question_text: '3. Rent payment includes internet connectivity and utility bills.',
        question_type: 'true_false_not_given',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correct_answer: 'TRUE',
        max_score: 1
      },
      {
        question_id: 'L4',
        section: 'listening',
        question_text: '4. The student must submit their deposit before which date?',
        question_type: 'fill_in_blank',
        correct_answer: 'JULY 15',
        max_score: 1
      },

      // READING QUESTIONS
      {
        question_id: 'R1',
        section: 'reading',
        question_text: '1. Which paragraph contains information regarding the initial efficiency percentage of early photovoltaic solar cells?',
        question_type: 'multiple_choice',
        options: ['A. Paragraph A', 'B. Paragraph B', 'C. Paragraph C', 'D. Paragraph D'],
        correct_answer: 'B',
        max_score: 1
      },
      {
        question_id: 'R2',
        section: 'reading',
        question_text: '2. Between 2010 and 2020, the levelized cost of energy (LCOE) for solar power decreased by approximately 85%.',
        question_type: 'true_false_not_given',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correct_answer: 'TRUE',
        max_score: 1
      },
      {
        question_id: 'R3',
        section: 'reading',
        question_text: '3. What technology is used alongside green hydrogen to address renewable energy intermittency?',
        question_type: 'fill_in_blank',
        correct_answer: 'LITHIUM-ION BATTERY',
        max_score: 1
      },
      {
        question_id: 'R4',
        section: 'reading',
        question_text: '4. Germany and China utilized government subsidies to expand renewable energy manufacturing scale.',
        question_type: 'true_false_not_given',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correct_answer: 'TRUE',
        max_score: 1
      }
    ]
  },
  {
    exam_code: 'PRAC02',
    title: 'IELTS General Practice Test 02 (Practice Mode)',
    test_type: 'PRACTICE',
    duration_mins: 90,
    audio_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=english-conversation-11823.mp3',
    audio_title: 'IELTS Practice Listening Module - Customer Service Survey',
    reading_passage_title: 'Reading Notice: Guidelines for Remote Working Employees',
    reading_passage: `SECTION 1: WORKING HOURS AND AVAILABILITY
All full-time remote employees must maintain core working hours between 09:00 AM and 15:00 PM GMT. During these hours, staff members are required to be reachable via company Slack and Microsoft Teams. Any temporary absence exceeding 30 minutes must be logged in the team calendar in advance.

SECTION 2: EQUIPMENT AND CYBERSECURITY
The company provides a standardized laptop, noise-canceling headset, and dual monitors for remote setup. Staff are strictly prohibited from storing confidential client records on personal drives or unencrypted USB sticks. Virtual Private Network (VPN) connection must be activated at all times when accessing internal databases.`,
    writing_task1_prompt: 'You recently ordered an electronic gadget online, but it arrived damaged. Write a letter to the store manager explaining the issue, describing the damage, and requesting a replacement or refund. (At least 150 words)',
    writing_task2_prompt: 'Many working adults are changing careers later in life. What are the causes of this trend, and what effects does it have on society? (At least 250 words)',
    questions: [
      {
        question_id: 'PL1',
        section: 'listening',
        question_text: '1. What time do core working hours begin according to the policy?',
        question_type: 'fill_in_blank',
        correct_answer: '09:00 AM',
        max_score: 1
      },
      {
        question_id: 'PL2',
        section: 'listening',
        question_text: '2. Absences longer than 30 minutes must be logged in advance.',
        question_type: 'true_false_not_given',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correct_answer: 'TRUE',
        max_score: 1
      },
      {
        question_id: 'PR1',
        section: 'reading',
        question_text: '1. Which software must be active when accessing internal company databases?',
        question_type: 'fill_in_blank',
        correct_answer: 'VPN',
        max_score: 1
      },
      {
        question_id: 'PR2',
        section: 'reading',
        question_text: '2. Employees are permitted to save confidential client data on personal USB flash drives.',
        question_type: 'true_false_not_given',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correct_answer: 'FALSE',
        max_score: 1
      }
    ]
  }
];
