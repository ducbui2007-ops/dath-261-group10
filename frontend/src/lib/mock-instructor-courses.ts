import type { InstructorCourseCardData } from "@/components/instructor/instructor-course-card";
import type { Course } from "@/types/course";

type MockInstructorCourse = InstructorCourseCardData &
  Pick<Course, "description" | "thumbnailUrl" | "category" | "level" | "chapters">;

// Sample metadata for local previews only; these fixtures are not server records.
export const MOCK_INSTRUCTOR_COURSES: MockInstructorCourse[] = [
  {
    id: "data-structures-and-algorithms",
    title: "Data Structures and Algorithms",
    isPublished: true,
    enrollmentCount: 128,
    description: "Explore data structures, algorithm design, and complexity through practical exercises.",
    thumbnailUrl: "https://example.com/courses/data-structures-and-algorithms.png",
    category: "Computer Science",
    level: "Intermediate",
    chapters: [],
  },
  {
    id: "software-engineering",
    title: "Software Engineering",
    isPublished: false,
    enrollmentCount: 42,
    description: "Learn requirements, software design, testing, and collaborative development practices.",
    thumbnailUrl: "https://example.com/courses/software-engineering.png",
    category: "Software Engineering",
    level: "Beginner",
    chapters: [],
  },
  {
    id: "computer-networks",
    title: "Computer Networks",
    isPublished: true,
    enrollmentCount: 96,
    description: "Study network layers, protocols, routing, and reliable communication between systems.",
    thumbnailUrl: "https://example.com/courses/computer-networks.png",
    category: "Networking",
    level: "Intermediate",
    chapters: [],
  },
];
