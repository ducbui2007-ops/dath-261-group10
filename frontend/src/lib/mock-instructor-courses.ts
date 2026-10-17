import type { InstructorCourseCardData } from "@/components/instructor/instructor-course-card";

export const MOCK_INSTRUCTOR_COURSES: InstructorCourseCardData[] = [
  {
    id: "data-structures-and-algorithms",
    title: "Data Structures and Algorithms",
    isPublished: true,
    enrollmentCount: 128,
  },
  {
    id: "software-engineering",
    title: "Software Engineering",
    isPublished: false,
    enrollmentCount: 42,
  },
  {
    id: "computer-networks",
    title: "Computer Networks",
    isPublished: true,
    enrollmentCount: 96,
  },
];
