const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || "Request failed";
    throw new Error(message);
  }

  return data;
}

export async function getModules() {
  return request("/api/admin/modules");
}

export async function createModule(payload) {
  return request("/api/admin/modules", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateModule(moduleId, payload) {
  return request(`/api/admin/modules/${moduleId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteModule(moduleId) {
  return request(`/api/admin/modules/${moduleId}`, {
    method: "DELETE"
  });
}

export async function getCourses() {
  return request("/api/admin/courses");
}

export async function getCourseById(courseId) {
  return request(`/api/admin/courses/${courseId}`);
}

export async function createCourse(payload) {
  return request("/api/admin/courses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateCourse(courseId, payload) {
  return request(`/api/admin/courses/${courseId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteCourse(courseId) {
  return request(`/api/admin/courses/${courseId}`, {
    method: "DELETE"
  });
}

export async function addLessonToWeek(weekId, payload) {
  return request(`/api/admin/courses/weeks/${weekId}/lessons`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function removeLessonFromWeek(weekLessonId) {
  return request(`/api/admin/courses/week-lessons/${weekLessonId}`, {
    method: "DELETE"
  });
}

export async function reorderWeekLessons(weekId, payload) {
  return request(`/api/admin/courses/weeks/${weekId}/lessons/reorder`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function uploadLessonThumbnail(file) {
  const formData = new FormData();
  formData.append("thumbnail", file);

  const response = await fetch(`${API_BASE_URL}/api/admin/lessons/upload-thumbnail`, {
    method: "POST",
    body: formData
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Thumbnail upload failed");
  }

  return data;
}

export async function getLessonById(lessonId) {
  return request(`/api/admin/lessons/${lessonId}`);
}

export async function getAllLessons() {
  return request("/api/admin/lessons");
}

export async function createLesson(moduleId, payload) {
  return request(`/api/admin/modules/${moduleId}/lessons`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateLesson(lessonId, payload) {
  return request(`/api/admin/lessons/${lessonId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteLesson(lessonId) {
  return request(`/api/admin/lessons/${lessonId}`, {
    method: "DELETE"
  });
}

export async function getQuestionsByLesson(lessonId) {
  return request(`/api/admin/lessons/${lessonId}/questions`);
}

export async function createQuestion(lessonId, payload) {
  return request(`/api/admin/lessons/${lessonId}/questions`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createQuestionOption(questionId, payload) {
  return request(`/api/admin/questions/${questionId}/options`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateQuestion(questionId, payload) {
  return request(`/api/admin/questions/${questionId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteQuestion(questionId) {
  return request(`/api/admin/questions/${questionId}`, {
    method: "DELETE"
  });
}
