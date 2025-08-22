import { apiService } from '../apiService.js';
import { showConfirmationModal, showToast } from './helpers.js';

// Helper: Query wrapper (adjust to your apiService GET method if needed)
const getAll = (collection, query = {}) => {
  // If your apiService supports params separately, use that instead of building URL
  const qs = new URLSearchParams(query).toString();
  const path = qs ? `${collection}?${qs}` : collection;
  // Try getAll -> list -> get
  if (typeof apiService.getAll === 'function') return apiService.getAll(path);
  if (typeof apiService.list === 'function') return apiService.list(collection, query);
  if (typeof apiService.get === 'function') return apiService.get(path);
  throw new Error('apiService needs a GET method like getAll/list/get');
};

export async function seedCustomAcademicData() {
  showToast('Preparing academic structure from database...', 'info');

  try {
    // --- ধাপ ১: ডাটাবেস থেকে ডিপার্টমেন্ট এবং টিচার আনা হচ্ছে ---
    const [departments, teachers] = await Promise.all([
      getAll('departments'),
      getAll('teachers')
    ]);

    if (!departments?.length) {
      showToast('No departments found in database. Aborting.', 'warning');
      return;
    }

    // departmentId -> first teacher in that department
    const teacherByDept = {};
    for (const t of (teachers || [])) {
      if (t.departmentId && !teacherByDept[t.departmentId]) {
        teacherByDept[t.departmentId] = t;
      }
    }

    // --- ধাপ ২: প্রতিটি ডিপার্টমেন্টে সাবজেক্ট ও সেকশন নিশ্চিত করা (idempotent) ---
    const sections = [];

    for (const dept of departments) {
      const subjectName = `Introduction to ${dept.name}`;

      // Check if subject exists for this department
      let subjects = await getAll('subjects', { departmentId: dept.id, name: subjectName });
      let subject = subjects?.[0];

      if (!subject) {
        subject = await apiService.create('subjects', {
          name: subjectName,
          departmentId: dept.id
        });
      }

      if (!subject) {
        console.warn(`Failed to ensure subject for dept: ${dept.name}`);
        continue;
      }

      // Check if Section 'A' exists for this subject
      let existingSections = await getAll('sections', { subjectId: subject.id, name: 'A' });
      let section = existingSections?.[0];

      if (!section) {
        section = await apiService.create('sections', {
          name: 'A',
          subjectId: subject.id,
          classTeacherId: teacherByDept[dept.id]?.id || null // may be null if no teacher found
        });
      }

      if (section) sections.push(section);
    }

    console.log(`${sections.length} sections ensured/created.`);

    // --- ধাপ ৩: প্রতিটি সেকশনে ৩ জন ছাত্র নিশ্চিত করা (ডুপ্লিকেট এড়ানো) ---
    let studentsCreatedCount = 0;
    let studentsFailedCount = 0;

    for (const section of sections) {
      // get current students to avoid duplicates
      const existingStudents = await getAll('students', { sectionId: section.id });
      const already = existingStudents?.length || 0;
      const toCreate = Math.max(0, 3 - already);

      for (let i = 1; i <= toCreate; i++) {
        const nextIndex = already + i;
        const rollNo = `S-${100 + nextIndex}`;
        const studentName = `Student ${100 + nextIndex}`;
        const email = `student_${section.id}_${100 + nextIndex}@school.com`; // unique per section

        const studentPayload = {
          name: studentName,
          email,
          password: 'student123',
          rollNo,
          sectionId: section.id,
          guardianName: `Guardian of ${studentName}`,
          contact: `0180000${section.id}${nextIndex}`, // reasonably unique
          dateOfBirth: '2010-01-01',
          gender: nextIndex % 2 === 0 ? 'Female' : 'Male',
          address: 'Dhaka, Bangladesh'
        };

        const newStudent = await apiService.create('students', studentPayload);

        if (newStudent?.id) {
          // Optional sanity-check (like your previous improved check)
          if (newStudent.sectionId) {
            studentsCreatedCount++;

            // Ensure a user record for the student (idempotent: check by email)
            const existingUser = (await getAll('users', { email }))?.[0];
            if (!existingUser) {
              await apiService.create('users', {
                name: newStudent.name,
                email: newStudent.email,
                password: 'student123',
                role: 'Student',
                studentId: newStudent.id
              });
            }
          } else {
            studentsFailedCount++;
            console.error(`CRITICAL WARNING: Student '${newStudent.name}' created but sectionId missing from backend response.`);
          }
        } else {
          studentsFailedCount++;
          console.error(`Failed to create student with roll No: ${rollNo}.`);
        }
      }
    }

    console.log(`${studentsCreatedCount} students created (if needed).`);
    if (studentsFailedCount > 0) {
      showToast(`${studentsFailedCount} student(s) could not be assigned a section. Check console.`, 'error');
    } else {
      showToast('Academic structure prepared from database successfully!', 'success');
    }
  } catch (error) {
    console.error('Failed to prepare structure from DB:', error);
    showToast('Error preparing structure from DB. Check console.', 'error');
  }
}

// Reset flow stays, but now backend holds “reset”
export const handleResetData = () => {
  showConfirmationModal(
    'Are you sure you want to reset all data?',
    async () => {
      try {
        // Server-side reset only
        await apiService.create('reset');
        // Then prepare structure using existing DB entities (no hardcoded arrays)
        await seedCustomAcademicData();

        showToast('Application data has been reset and structure prepared.', 'success');
        sessionStorage.removeItem('sms_user_pro');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        console.error('Reset error:', err);
        showToast('Error during reset. Check console.', 'error');
      }
    }
  );
};