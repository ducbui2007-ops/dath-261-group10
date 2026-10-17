import { CourseForm } from "@/components/instructor/course-form";

export default function CreateCoursePage() {
  return (
    <CourseForm
      mode="create"
      initialValues={{
        title: "",
        description: "",
        thumbnailUrl: "",
        category: "",
        level: "Beginner",
      }}
    />
  );
}
