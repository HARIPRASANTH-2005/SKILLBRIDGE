
// ─────────────────────────────────────────────
// routes/alumni.js
// MCA Alumni Registration & Dashboard
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

const ProjectMember = require('../models/ProjectMember');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs/promises');

const upload = require('../middleware/upload');

const User = require('../models/User');
const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const Task = require('../models/Task');
const Review = require('../models/Review');

const { isDbConnected } = require('../config/db');

const {
  requireAuth,
  requireApproved,
  requireRole
} = require('../middleware/auth');


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const isValidEmail = (email) => {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
};

const removeUploadedFile = async (file) => {
  if (!file || !file.path) return;

  try {
    await fs.unlink(file.path);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Uploaded file cleanup error:', err.message);
    }
  }
};

const registrationFormData = (data = {}) => ({
  fullName: data.fullName || '',
  email: data.email || '',
  mobile: data.mobile || '',
  rollNumber: data.rollNumber || '',
  admissionBatch: data.admissionBatch || '',
  graduationYear: data.graduationYear || '',
  profession: data.profession || '',
  company: data.company || '',
  linkedin: data.linkedin || ''
});

const renderRegistration = (res, {
  errors = [],
  formData = {},
  statusCode = 200
} = {}) => {
  return res.status(statusCode).render('alumni/register', {
    title: 'MCA Alumni Registration — SkillBridge',
    errors,
    formData: registrationFormData(formData)
  });
};


// ─────────────────────────────────────────────
// GET /alumni/register
// Display alumni registration form
// ─────────────────────────────────────────────

router.get('/register', (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'alumni') {
      return res.redirect('/alumni/dashboard');
    }
  }

  res.render('alumni/register', {
    title: 'MCA Alumni Registration — SkillBridge',
    errors: [],
    formData: {}
  });
});


// ─────────────────────────────────────────────
// POST /alumni/register
// Process alumni registration
// ─────────────────────────────────────────────

router.post('/register', upload.single('document'), async (req, res) => {
  const {
    fullName,
    email,
    mobile,
    rollNumber,
    admissionBatch,
    graduationYear,
    profession,
    company,
    linkedin,
    password,
    confirmPassword
  } = req.body;

  const cleanName =
    typeof fullName === 'string' ? fullName.trim() : '';

  const cleanEmail =
    typeof email === 'string' ? email.trim().toLowerCase() : '';

  const cleanRoll =
    typeof rollNumber === 'string'
      ? rollNumber.trim().toUpperCase()
      : '';

  const cleanAdmissionBatch =
    typeof admissionBatch === 'string'
      ? admissionBatch.trim()
      : '';

  const cleanGraduationYear =
    typeof graduationYear === 'string'
      ? graduationYear.trim()
      : '';

  const errors = [];

  if (cleanName.length < 2 || cleanName.length > 120) {
    errors.push({
      msg: 'Official full name must contain between 2 and 120 characters.'
    });
  }

  if (!isValidEmail(cleanEmail)) {
    errors.push({
      msg: 'A valid email address is required.'
    });
  }

  if (cleanRoll.length < 4 || cleanRoll.length > 30) {
    errors.push({
      msg: 'Original MCA roll number as recorded at PSG Tech is required.'
    });
  }

  if (!/^\d{4}$/.test(cleanAdmissionBatch)) {
    errors.push({
      msg: 'Admission batch must be a valid 4-digit year.'
    });
  }

  if (!/^\d{4}$/.test(cleanGraduationYear)) {
    errors.push({
      msg: 'Graduation year must be a valid 4-digit year.'
    });
  }

  if (
    !password ||
    typeof password !== 'string' ||
    password.length < 8
  ) {
    errors.push({
      msg: 'Password must be at least 8 characters long.'
    });
  }

  if (password !== confirmPassword) {
    errors.push({
      msg: 'Passwords do not match.'
    });
  }

  if (!req.file) {
    errors.push({
      msg: 'MCA graduation certificate or provisional certificate is required.'
    });
  }

  const formData = {
    fullName: cleanName,
    email: cleanEmail,
    mobile,
    rollNumber: cleanRoll,
    admissionBatch: cleanAdmissionBatch,
    graduationYear: cleanGraduationYear,
    profession,
    company,
    linkedin
  };

  if (errors.length > 0) {
    await removeUploadedFile(req.file);

    return renderRegistration(res, {
      errors,
      formData
    });
  }

  if (!isDbConnected()) {
    await removeUploadedFile(req.file);

    return renderRegistration(res, {
      errors: [
        {
          msg: 'Registration is temporarily unavailable because the database is not connected. Please try again later.'
        }
      ],
      formData,
      statusCode: 503
    });
  }

  try {
    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        { rollNumber: cleanRoll }
      ]
    }).select('_id email rollNumber');

    if (existingUser) {
      await removeUploadedFile(req.file);

      return renderRegistration(res, {
        errors: [
          {
            msg: 'An account with this email address or MCA roll number already exists.'
          }
        ],
        formData,
        statusCode: 409
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAlumni = new User({
      fullName: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      mobile:
        typeof mobile === 'string' ? mobile.trim() : '',

      role: 'alumni',
      status: 'pending',

      rollNumber: cleanRoll,
      admissionBatch: cleanAdmissionBatch,
      graduationYear: cleanGraduationYear,

      profession:
        typeof profession === 'string' ? profession.trim() : '',

      company:
        typeof company === 'string' ? company.trim() : '',

      linkedin:
        typeof linkedin === 'string' ? linkedin.trim() : '',

      documentFilename: req.file.filename,
      documentOriginalName: req.file.originalname,
      documentMimeType: req.file.mimetype,
      documentSizeBytes: req.file.size
    });

    await newAlumni.save();

    return res.render('alumni/register', {
      title: 'MCA Alumni Registration — SkillBridge',
      errors: [],
      formData: {},
      success:
        `Registration received! Your degree proof and alumni credentials (Roll: ${cleanRoll}) have been submitted for administrator verification. You can check your verification status at /status.`
    });

  } catch (err) {
    console.error('Alumni registration error:', err.message);

    await removeUploadedFile(req.file);

    if (err.code === 11000) {
      return renderRegistration(res, {
        errors: [
          {
            msg: 'An account with this email address or MCA roll number already exists.'
          }
        ],
        formData,
        statusCode: 409
      });
    }

    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(
        (item) => ({ msg: item.message })
      );

      return renderRegistration(res, {
        errors: validationErrors,
        formData,
        statusCode: 400
      });
    }

    return renderRegistration(res, {
      errors: [
        {
          msg: 'Registration could not be completed due to a server error. Please try again later.'
        }
      ],
      formData,
      statusCode: 500
    });
  }
});


// ─────────────────────────────────────────────
// GET /alumni/dashboard
// Dynamic MongoDB-backed alumni dashboard
// ─────────────────────────────────────────────

router.get(
  '/dashboard',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).render('500', {
        title: '503 — Service Unavailable',
        error: 'The alumni dashboard is temporarily unavailable because the database is disconnected.'
      });
    }

    try {
      const alumniId = req.session.user._id;

      const projectsFromDatabase = await Project.find({
        creatorId: alumniId
      })
        .sort({ createdAt: -1 })
        .lean();

      const projectIds = projectsFromDatabase.map(
        project => project._id
      );

      const [
        proposalCount,
        pendingProposalCount,
        activeStudentIds,
        reviewedTaskCount,
        proposalCountsByProject,
        memberCountsByProject,
        recentProposalDocuments
      ] = await Promise.all([

        Proposal.countDocuments({
          projectId: { $in: projectIds }
        }),

        Proposal.countDocuments({
          projectId: { $in: projectIds },
          status: 'pending'
        }),

        ProjectMember.distinct('studentId', {
          projectId: { $in: projectIds },
          status: 'active'
        }),

        Task.countDocuments({
          reviewedBy: alumniId,
          reviewDecision: 'approved'
        }),

        Proposal.aggregate([
          {
            $match: {
              projectId: { $in: projectIds }
            }
          },
          {
            $group: {
              _id: '$projectId',
              count: { $sum: 1 }
            }
          }
        ]),

        ProjectMember.aggregate([
          {
            $match: {
              projectId: { $in: projectIds },
              status: 'active'
            }
          },
          {
            $group: {
              _id: '$projectId',
              count: { $sum: 1 }
            }
          }
        ]),

        Proposal.find({
          projectId: { $in: projectIds },
          status: 'pending'
        })
          .sort({ submittedAt: -1, createdAt: -1 })
          .limit(5)
          .populate({
            path: 'studentId',
            select: 'fullName rollNumber currentYear skills status'
          })
          .lean()

      ]);

      const proposalCountMap = new Map(
        proposalCountsByProject.map(item => [
          item._id.toString(),
          item.count
        ])
      );

      const memberCountMap = new Map(
        memberCountsByProject.map(item => [
          item._id.toString(),
          item.count
        ])
      );

      const createdProjects = projectsFromDatabase.map(project => ({
        ...project,
        applicantCount:
          proposalCountMap.get(project._id.toString()) || 0,
        activeMenteeCount:
          memberCountMap.get(project._id.toString()) || 0
      }));

      const projectTitleMap = new Map(
        projectsFromDatabase.map(project => [
          project._id.toString(),
          project.title
        ])
      );

      const recentProposals = recentProposalDocuments.map(proposal => {
        const student =
          proposal.studentId &&
          typeof proposal.studentId === 'object'
            ? proposal.studentId
            : null;

        const proposalProjectId = proposal.projectId
          ? proposal.projectId.toString()
          : '';

        return {
          ...proposal,

          studentName:
            student?.fullName ||
            proposal.studentName ||
            'Student',

          studentRoll:
            student?.rollNumber ||
            proposal.studentRoll ||
            '',

          projectTitle:
            projectTitleMap.get(proposalProjectId) || 'Project',

          message:
            proposal.message ||
            proposal.coverLetter ||
            ''
        };
      });

      const dashboardStats = {
        projectCount: projectsFromDatabase.length,
        proposalCount,
        pendingProposalCount,
        activeMenteeCount: activeStudentIds.length,
        reviewedTaskCount
      };

      return res.render('alumni/dashboard', {
        title: 'Alumni Dashboard — SkillBridge',
        currentUser: req.session.user,
        dashboardStats,
        createdProjects,
        recentProposals
      });

    } catch (err) {
      console.error('Alumni dashboard error:', err);

      return res.status(500).render('500', {
        title: '500 — Internal Server Error',
        error: 'Unable to load your alumni dashboard. Please try again later.'
      });
    }
  }
);



// ─────────────────────────────────────────────
// GET /alumni/profile
// Dynamic MongoDB-backed alumni profile
// ─────────────────────────────────────────────

router.get(
  '/profile',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {

    if (!isDbConnected()) {
      return res.status(503).render('500', {
        title: '503 — Service Unavailable',
        error: 'Your alumni profile is temporarily unavailable because the database is disconnected.'
      });
    }

    try {
      const alumniId = req.session.user._id;

      // 1. Fetch the logged-in alumni account.
      const alumni = await User.findOne({
        _id: alumniId,
        role: 'alumni',
        status: 'approved'
      })
        .select('-password')
        .lean();

      if (!alumni) {
        return res.status(404).render('404', {
          title: 'Alumni Profile Not Found — SkillBridge'
        });
      }

      // 2. Fetch projects created by this alumni.
      const createdProjects = await Project.find({
        creatorId: alumniId
      })
        .sort({ createdAt: -1 })
        .lean();

      const projectIds = createdProjects.map(
        project => project._id
      );

      // 3. Fetch proposal statistics and project memberships.
      const [
        proposalStatistics,
        projectMembers
      ] = await Promise.all([

        Proposal.aggregate([
          {
            $match: {
              projectId: { $in: projectIds }
            }
          },
          {
            $group: {
              _id: {
                projectId: '$projectId',
                status: '$status'
              },
              count: { $sum: 1 }
            }
          }
        ]),

        ProjectMember.find({
          projectId: { $in: projectIds },
          status: { $in: ['active', 'completed'] }
        })
          .populate({
            path: 'studentId',
            select: 'fullName rollNumber'
          })
          .sort({ joinedAt: -1 })
          .lean()

      ]);

      // 4. Organize proposal statistics by project.
      const proposalStatsMap = new Map();

      for (const item of proposalStatistics) {
        const projectId = item._id.projectId.toString();

        if (!proposalStatsMap.has(projectId)) {
          proposalStatsMap.set(projectId, {
            total: 0,
            pending: 0,
            accepted: 0,
            declined: 0
          });
        }

        const stats = proposalStatsMap.get(projectId);

        stats.total += item.count;

        if (
          Object.prototype.hasOwnProperty.call(
            stats,
            item._id.status
          )
        ) {
          stats[item._id.status] += item.count;
        }
      }

      // 5. Organize student memberships by project.
      const membersMap = new Map();

      for (const member of projectMembers) {
        const projectId = member.projectId.toString();

        if (!membersMap.has(projectId)) {
          membersMap.set(projectId, []);
        }

        const student =
          member.studentId &&
          typeof member.studentId === 'object'
            ? member.studentId
            : null;

        membersMap.get(projectId).push({
          fullName: student?.fullName || 'Student',
          rollNumber: student?.rollNumber || '',
          role: member.role,
          status: member.status,
          joinedAt: member.joinedAt,
          completedAt: member.completedAt
        });
      }

      // 6. Prepare project cards for profile.ejs.
      const alumniProjects = createdProjects.map(project => {
        const projectId = project._id.toString();

        const proposalStats =
          proposalStatsMap.get(projectId) || {
            total: 0,
            pending: 0,
            accepted: 0,
            declined: 0
          };

        const members = membersMap.get(projectId) || [];

        const activeMembers = members.filter(
          member => member.status === 'active'
        );

        const completedMembers = members.filter(
          member => member.status === 'completed'
        );

        return {
          ...project,

          proposalStats,

          members,

          memberStats: {
            active: activeMembers.length,
            completed: completedMembers.length
          },

          activeMenteeCount: activeMembers.length,
          completedMenteeCount: completedMembers.length
        };
      });

      // 7. Calculate overall profile statistics.
      const activeStudentIds = new Set(
        projectMembers
          .filter(member => member.status === 'active')
          .map(member => {
            const student = member.studentId;

            if (!student) return null;

            return student._id
              ? student._id.toString()
              : student.toString();
          })
          .filter(Boolean)
      );

      const profileStats = {
        projectCount: createdProjects.length,

        completedProjectCount: createdProjects.filter(
          project => project.status === 'completed'
        ).length,

        totalProposalCount: proposalStatistics.reduce(
          (total, item) => total + item.count,
          0
        ),

        pendingProposalCount: proposalStatistics
          .filter(item => item._id.status === 'pending')
          .reduce(
            (total, item) => total + item.count,
            0
          ),

        activeMenteeCount: activeStudentIds.size
      };

      // 8. Retrieve the latest verification record.
      const verificationHistory = [
        ...(alumni.verificationHistory || [])
      ].sort(
        (a, b) =>
          new Date(b.timestamp || 0) -
          new Date(a.timestamp || 0)
      );

      const latestVerification =
        verificationHistory[0] || null;

      // 9. Render the alumni profile.
      return res.render('alumni/profile', {
        title: 'Alumni Profile — SkillBridge',

        alumni,

        createdProjects: alumniProjects,

        profileStats,

        latestVerification,

        // These names match the EJS template.
        success:
          req.query.success === 'updated'
            ? 'updated'
            : '',

        error: req.query.error || ''
      });

    } catch (err) {
      console.error('Alumni profile error:', err);

      return res.status(500).render('500', {
        title: '500 — Internal Server Error',
        error: 'Unable to load your alumni profile. Please try again later.'
      });
    }
  }
);



// ─────────────────────────────────────────────
// POST /alumni/profile/update
// Securely update permitted alumni profile fields
// ─────────────────────────────────────────────

router.post(
  '/profile/update',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    const redirectWithError = (message) => {
      return res.redirect(
        `/alumni/profile?error=${encodeURIComponent(message)}`
      );
    };

    if (!isDbConnected()) {
      return redirectWithError(
        'Database is unavailable. Your profile was not updated.'
      );
    }

    try {
      const {
        fullName,
        mobile,
        profession,
        company,
        linkedin,
        skills
      } = req.body;

      // 1. Validate and normalize the full name.
      const cleanName =
        typeof fullName === 'string'
          ? fullName.trim()
          : '';

      if (cleanName.length < 2 || cleanName.length > 120) {
        return redirectWithError(
          'Full name must contain between 2 and 120 characters.'
        );
      }

      // 2. Validate the mobile number.
      const cleanMobile =
        typeof mobile === 'string'
          ? mobile.trim()
          : '';

      if (cleanMobile) {
        const digitsOnly = cleanMobile.replace(/\D/g, '');

        if (
          !/^[+]?[\d\s().-]+$/.test(cleanMobile) ||
          digitsOnly.length < 7 ||
          digitsOnly.length > 15
        ) {
          return redirectWithError(
            'Please enter a valid mobile number.'
          );
        }
      }

      // 3. Validate professional information.
      const cleanProfession =
        typeof profession === 'string'
          ? profession.trim()
          : '';

      const cleanCompany =
        typeof company === 'string'
          ? company.trim()
          : '';

      if (cleanProfession.length > 120) {
        return redirectWithError(
          'Profession cannot exceed 120 characters.'
        );
      }

      if (cleanCompany.length > 120) {
        return redirectWithError(
          'Company name cannot exceed 120 characters.'
        );
      }

      // 4. Validate LinkedIn URL.
      const cleanLinkedin =
        typeof linkedin === 'string'
          ? linkedin.trim()
          : '';

      if (cleanLinkedin) {
        try {
          const parsedUrl = new URL(cleanLinkedin);

          if (
            !['http:', 'https:'].includes(parsedUrl.protocol) ||
            !['linkedin.com', 'www.linkedin.com'].includes(
              parsedUrl.hostname.toLowerCase()
            )
          ) {
            return redirectWithError(
              'Please provide a valid LinkedIn profile URL.'
            );
          }
        } catch {
          return redirectWithError(
            'Please provide a valid LinkedIn profile URL, including https://.'
          );
        }
      }

      // 5. Normalize skills.
      let submittedSkills = [];

      if (Array.isArray(skills)) {
        submittedSkills = skills;
      } else if (typeof skills === 'string') {
        submittedSkills = skills.split(',');
      }

      if (submittedSkills.length > 20) {
        return redirectWithError(
          'You can add a maximum of 20 mentorship skills.'
        );
      }

      const cleanSkills = submittedSkills
        .filter(skill => typeof skill === 'string')
        .map(skill => skill.trim())
        .filter(Boolean);

      if (cleanSkills.some(skill => skill.length > 50)) {
        return redirectWithError(
          'Each skill must contain no more than 50 characters.'
        );
      }

      // Remove duplicate skills without changing their display names.
      const uniqueSkills = [
        ...new Map(
          cleanSkills.map(skill => [
            skill.toLowerCase(),
            skill
          ])
        ).values()
      ];

      // 6. Update only explicitly permitted fields.
      // Email, roll number, academic records, role, status,
      // documents and verification history are never updated here.
      const updatedAlumni = await User.findOneAndUpdate(
        {
          _id: req.session.user._id,
          role: 'alumni',
          status: 'approved'
        },
        {
          $set: {
            fullName: cleanName,
            mobile: cleanMobile,
            profession: cleanProfession,
            company: cleanCompany,
            linkedin: cleanLinkedin,
            skills: uniqueSkills
          }
        },
        {
          new: true,
          runValidators: true
        }
      )
        .select('_id fullName')
        .lean();

      if (!updatedAlumni) {
        return redirectWithError(
          'Your alumni account could not be found or is no longer approved.'
        );
      }

      // Keep the current session name synchronized.
      req.session.user.fullName = updatedAlumni.fullName;

      return res.redirect(
        '/alumni/profile?success=updated'
      );

    } catch (err) {
      console.error('Alumni profile update error:', err);

      if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
          .map(item => item.message)
          .join(' ');

        return redirectWithError(message);
      }

      return redirectWithError(
        'Unable to update your profile. Please try again later.'
      );
    }
  }
);



// // ─────────────────────────────────────────────
// // POST /alumni/profile/update
// // Secure alumni profile update
// // ─────────────────────────────────────────────

// router.post(
//   '/profile/update',
//   requireAuth,
//   requireApproved,
//   requireRole('alumni'),
//   async (req, res) => {

//     const redirectWithError = (message) => {
//       return res.redirect(
//         `/alumni/profile?error=${encodeURIComponent(message)}`
//       );
//     };

//     if (!isDbConnected()) {
//       return res.status(503).render('500', {
//         title: '503 — Service Unavailable',
//         error: 'Profile updates are temporarily unavailable.'
//       });
//     }

//     try {
//       const {
//         fullName,
//         mobile,
//         profession,
//         company,
//         linkedin,
//         skills
//       } = req.body;

//       // Validate and normalize editable fields.
//       const cleanName =
//         typeof fullName === 'string' ? fullName.trim() : '';

//       const cleanMobile =
//         typeof mobile === 'string' ? mobile.trim() : '';

//       const cleanProfession =
//         typeof profession === 'string' ? profession.trim() : '';

//       const cleanCompany =
//         typeof company === 'string' ? company.trim() : '';

//       const cleanLinkedin =
//         typeof linkedin === 'string' ? linkedin.trim() : '';

//       if (cleanName.length < 2 || cleanName.length > 120) {
//         return redirectWithError(
//           'Full name must contain between 2 and 120 characters.'
//         );
//       }

//       if (cleanMobile.length > 20) {
//         return redirectWithError(
//           'Mobile number cannot exceed 20 characters.'
//         );
//       }

//       if (cleanProfession.length > 120) {
//         return redirectWithError(
//           'Profession cannot exceed 120 characters.'
//         );
//       }

//       if (cleanCompany.length > 120) {
//         return redirectWithError(
//           'Company name cannot exceed 120 characters.'
//         );
//       }

//       // Validate LinkedIn URL.
//       if (cleanLinkedin) {
//         try {
//           const parsedUrl = new URL(cleanLinkedin);

//           if (
//             !['http:', 'https:'].includes(parsedUrl.protocol) ||
//             !['linkedin.com', 'www.linkedin.com'].includes(
//               parsedUrl.hostname.toLowerCase()
//             )
//           ) {
//             return redirectWithError(
//               'Please enter a valid LinkedIn profile URL.'
//             );
//           }
//         } catch {
//           return redirectWithError(
//             'Please enter a valid LinkedIn profile URL.'
//           );
//         }

//         if (cleanLinkedin.length > 2048) {
//           return redirectWithError(
//             'LinkedIn URL is too long.'
//           );
//         }
//       }

//       // Accept either an array or comma-separated skills input.
//       let cleanSkills = [];

//       if (Array.isArray(skills)) {
//         cleanSkills = skills;
//       } else if (typeof skills === 'string') {
//         cleanSkills = skills.split(',');
//       } else if (skills !== undefined) {
//         return redirectWithError(
//           'Invalid mentorship skills format.'
//         );
//       }

//       cleanSkills = [
//         ...new Set(
//           cleanSkills
//             .filter(skill => typeof skill === 'string')
//             .map(skill => skill.trim())
//             .filter(Boolean)
//             .map(skill => skill.slice(0, 50))
//         )
//       ];

//       if (cleanSkills.length > 30) {
//         return redirectWithError(
//           'You can add a maximum of 30 skills.'
//         );
//       }

//       // Update only explicitly permitted fields.
//       // Academic identity, email, role and verification
//       // fields cannot be changed through this endpoint.
//       const updatedAlumni = await User.findOneAndUpdate(
//         {
//           _id: req.session.user._id,
//           role: 'alumni',
//           status: 'approved'
//         },
//         {
//           $set: {
//             fullName: cleanName,
//             mobile: cleanMobile,
//             profession: cleanProfession,
//             company: cleanCompany,
//             linkedin: cleanLinkedin,
//             skills: cleanSkills
//           }
//         },
//         {
//           new: true,
//           runValidators: true,
//           select: 'fullName mobile profession company linkedin skills'
//         }
//       );

//       if (!updatedAlumni) {
//         return redirectWithError(
//           'Your alumni account could not be found or updated.'
//         );
//       }

//       // Keep the session display name synchronized.
//       req.session.user.fullName = updatedAlumni.fullName;

//       return res.redirect(
//         '/alumni/profile?success=updated'
//       );

//     } catch (err) {
//       console.error('Alumni profile update error:', err);

//       if (err.name === 'ValidationError') {
//         return redirectWithError(
//           'Some profile details are invalid. Please check your entries.'
//         );
//       }

//       return redirectWithError(
//         'Profile update failed. Please try again.'
//       );
//     }
//   }
// );


// ─────────────────────────────────────────────
// GET /alumni/proposals
// View proposals submitted to alumni projects
// ─────────────────────────────────────────────

router.get(
  '/proposals',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    if (!isDbConnected()) {
      return res.status(503).render('500', {
        title: '503 — Service Unavailable',
        error: 'Proposal information is temporarily unavailable.'
      });
    }

    try {
      const projects = await Project.find({
        creatorId: req.session.user._id
      })
        .select(
          'title skills maxStudents activeStudentCount status'
        )
        .sort({ createdAt: -1 })
        .lean();

      const projectIds = projects.map(project => project._id);

      const projectMap = new Map(
        projects.map(project => [
          project._id.toString(),
          project
        ])
      );

      const proposalDocuments = projectIds.length
        ? await Proposal.find({
            projectId: { $in: projectIds }
          })
            .sort({ submittedAt: -1 })
            .populate({
              path: 'studentId',
              select: 'fullName rollNumber currentYear skills status'
            })
            .lean()
        : [];

      const proposals = proposalDocuments.map(proposal => {
        const projectId = proposal.projectId
          ? proposal.projectId.toString()
          : '';

        const project = projectMap.get(projectId);

        const student =
          proposal.studentId &&
          typeof proposal.studentId === 'object'
            ? proposal.studentId
            : null;

        return {
          ...proposal,

          studentName:
            proposal.studentName ||
            student?.fullName ||
            'Student Applicant',

          studentRoll:
            proposal.studentRoll ||
            student?.rollNumber ||
            '',

          currentYear: student?.currentYear || '',
          studentSkills: student?.skills || [],
          studentStatus: student?.status || '',

          projectTitle: project?.title || 'Project',
          projectSkills: project?.skills || [],
          maxStudents: project?.maxStudents ?? 0,
          activeStudentCount: project?.activeStudentCount ?? 0,
          projectStatus: project?.status || ''
        };
      });

      return res.render('alumni/proposals', {
        title: 'Review Student Proposals — SkillBridge',
        proposals,
        message: req.query.message || '',
        error: req.query.error || ''
      });

    } catch (err) {
      console.error(
        'Alumni proposals query error:',
        err.message
      );

      return res.status(503).render('500', {
        title: '503 — Service Unavailable',
        error: 'Unable to load student proposals right now.'
      });
    }
  }
);


// ─────────────────────────────────────────────
// PROPOSAL DECISION HELPERS
// ─────────────────────────────────────────────

const proposalError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const isValidProposalId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};


// ─────────────────────────────────────────────
// POST /alumni/proposals/:proposalId/accept
// Accept a student proposal
// ─────────────────────────────────────────────

router.post(
  '/proposals/:proposalId/accept',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    const { proposalId } = req.params;

    let session;

    try {
      if (!isValidProposalId(proposalId)) {
        throw proposalError(400, 'Invalid proposal ID.');
      }

      if (!isDbConnected()) {
        throw proposalError(
          503,
          'Database is temporarily unavailable.'
        );
      }

      session = await mongoose.startSession();

      await session.withTransaction(async () => {
        const proposal = await Proposal.findById(proposalId)
          .session(session);

        if (!proposal) {
          throw proposalError(404, 'Proposal not found.');
        }

        if (proposal.status !== 'pending') {
          throw proposalError(
            409,
            'This proposal has already been processed.'
          );
        }

        const project = await Project.findOne({
          _id: proposal.projectId,
          creatorId: req.session.user._id
        }).session(session);

        if (!project) {
          throw proposalError(
            403,
            'You are not authorized to manage this project.'
          );
        }

        if (project.status !== 'open') {
          throw proposalError(
            409,
            'Only open projects can accept new students.'
          );
        }

        const student = await User.findOne({
          _id: proposal.studentId,
          role: 'student',
          status: 'approved'
        })
          .select('_id')
          .session(session);

        if (!student) {
          throw proposalError(
            409,
            'This applicant is not currently an approved student.'
          );
        }

        const existingMember = await ProjectMember.findOne({
          projectId: project._id,
          studentId: student._id
        }).session(session);

        if (existingMember && existingMember.status === 'active') {
          throw proposalError(
            409,
            'This student is already an active project member.'
          );
        }

        if (existingMember && existingMember.status === 'completed') {
          throw proposalError(
            409,
            'This student has already completed this project.'
          );
        }

        const updatedProject = await Project.findOneAndUpdate(
          {
            _id: project._id,
            status: 'open',
            $expr: {
              $lt: [
                { $ifNull: ['$activeStudentCount', 0] },
                '$maxStudents'
              ]
            }
          },
          {
            $inc: {
              activeStudentCount: 1
            }
          },
          {
            new: true,
            session
          }
        );

        if (!updatedProject) {
          throw proposalError(
            409,
            'This project is full or is no longer accepting students.'
          );
        }

        const acceptedProposal = await Proposal.findOneAndUpdate(
          {
            _id: proposal._id,
            status: 'pending'
          },
          {
            $set: {
              status: 'accepted'
            }
          },
          {
            new: true,
            session,
            runValidators: true
          }
        );

        if (!acceptedProposal) {
          throw proposalError(
            409,
            'The proposal was already processed.'
          );
        }

        if (existingMember) {
          const reactivatedMember =
            await ProjectMember.findOneAndUpdate(
              {
                _id: existingMember._id,
                status: 'removed'
              },
              {
                $set: {
                  status: 'active',
                  role: 'member',
                  proposalId: proposal._id
                },
                $unset: {
                  removedAt: 1,
                  removalReason: 1,
                  completedAt: 1
                }
              },
              {
                new: true,
                session,
                runValidators: true
              }
            );

          if (!reactivatedMember) {
            throw proposalError(
              409,
              'The previous membership could not be reactivated.'
            );
          }

        } else {
          await ProjectMember.create(
            [
              {
                projectId: project._id,
                studentId: student._id,
                proposalId: proposal._id,
                role: 'member',
                status: 'active',
                joinedAt: new Date()
              }
            ],
            { session }
          );
        }

        const activeMembers = await ProjectMember.find({
          projectId: project._id,
          status: 'active'
        })
          .select('studentId')
          .session(session)
          .lean();

        const memberIds = activeMembers.map(
          member => member.studentId
        );

        const approvedStudents = await User.find({
          _id: { $in: memberIds },
          role: 'student',
          status: 'approved'
        })
          .select('_id')
          .session(session)
          .lean();

        const participantIds = [
          project.creatorId,
          ...approvedStudents.map(member => member._id)
        ];

        if (participantIds.length > 101) {
          throw proposalError(
            409,
            'This project has reached its conversation participant limit.'
          );
        }

        const conversation = await Conversation.findOneAndUpdate(
          {
            type: 'project',
            projectId: project._id
          },
          {
            $setOnInsert: {
              type: 'project',
              projectId: project._id,
              createdBy: project.creatorId
            },
            $set: {
              isArchived: false
            },
            $addToSet: {
              participantIds: {
                $each: participantIds
              }
            }
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true,
            session
          }
        );

        if (!conversation) {
          throw new Error(
            'Project conversation could not be created.'
          );
        }

        await Notification.create(
          [
            {
              recipientId: student._id,
              senderId: project.creatorId,
              type: 'proposal_accepted',
              title: 'Your proposal was accepted',
              message:
                `Your proposal for "${project.title}" has been accepted.`,
              link: `/projects/${project._id}`,
              relatedProjectId: project._id,
              relatedProposalId: proposal._id
            }
          ],
          { session }
        );
      });

      return res.redirect(
        '/alumni/proposals?message=accepted'
      );

    } catch (err) {
      console.error(
        'Proposal acceptance error:',
        err.message
      );

      const message = err.status
        ? err.message
        : 'Proposal acceptance failed. Please try again.';

      return res.redirect(
        `/alumni/proposals?error=${encodeURIComponent(message)}`
      );

    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }
);


// ─────────────────────────────────────────────
// POST /alumni/proposals/:proposalId/decline
// Decline a student proposal
// ─────────────────────────────────────────────

router.post(
  '/proposals/:proposalId/decline',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    const { proposalId } = req.params;

    let session;

    try {
      if (!isValidProposalId(proposalId)) {
        throw proposalError(400, 'Invalid proposal ID.');
      }

      if (!isDbConnected()) {
        throw proposalError(
          503,
          'Database is temporarily unavailable.'
        );
      }

      session = await mongoose.startSession();

      await session.withTransaction(async () => {
        const proposal = await Proposal.findOne({
          _id: proposalId,
          status: 'pending'
        }).session(session);

        if (!proposal) {
          throw proposalError(
            404,
            'Pending proposal not found or already processed.'
          );
        }

        const project = await Project.findOne({
          _id: proposal.projectId,
          creatorId: req.session.user._id
        }).session(session);

        if (!project) {
          throw proposalError(
            403,
            'You are not authorized to manage this project.'
          );
        }

        const declinedProposal =
          await Proposal.findOneAndUpdate(
            {
              _id: proposal._id,
              status: 'pending'
            },
            {
              $set: {
                status: 'declined'
              }
            },
            {
              new: true,
              session,
              runValidators: true
            }
          );

        if (!declinedProposal) {
          throw proposalError(
            409,
            'The proposal was already processed.'
          );
        }

        await Notification.create(
          [
            {
              recipientId: proposal.studentId,
              senderId: project.creatorId,
              type: 'proposal_declined',
              title: 'Proposal update',
              message:
                `Your proposal for "${project.title}" was declined.`,
              link: `/projects/${project._id}`,
              relatedProjectId: project._id,
              relatedProposalId: proposal._id
            }
          ],
          { session }
        );
      });

      return res.redirect(
        '/alumni/proposals?message=declined'
      );

    } catch (err) {
      console.error(
        'Proposal decline error:',
        err.message
      );

      const message = err.status
        ? err.message
        : 'Proposal decline failed. Please try again.';

      return res.redirect(
        `/alumni/proposals?error=${encodeURIComponent(message)}`
      );

    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }
);


// ─────────────────────────────────────────────
// POST /alumni/projects/:projectId/tasks
// Create and assign a project task
// ─────────────────────────────────────────────

router.post(
  '/projects/:projectId/tasks',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    const { projectId } = req.params;

    const {
      title,
      description,
      priority,
      dueDate,
      assignedTo
    } = req.body;

    const redirectToBoard = (message) => {
      return res.redirect(
        `/projects/${projectId}/tasks?message=${encodeURIComponent(message)}`
      );
    };

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).render('404', {
        title: 'Project Not Found — SkillBridge'
      });
    }

    if (!isDbConnected()) {
      return res.status(503).render('500', {
        title: '503 — Service Unavailable',
        error: 'Database is unavailable. The task could not be created.'
      });
    }

    const cleanTitle =
      typeof title === 'string' ? title.trim() : '';

    const cleanDescription =
      typeof description === 'string'
        ? description.trim()
        : '';

    const allowedPriorities = [
      'low',
      'medium',
      'high',
      'urgent'
    ];

    const cleanPriority =
      typeof priority === 'string'
        ? priority.trim().toLowerCase()
        : 'medium';

    if (cleanTitle.length < 2 || cleanTitle.length > 160) {
      return redirectToBoard(
        'Task title must contain between 2 and 160 characters.'
      );
    }

    if (cleanDescription.length > 5000) {
      return redirectToBoard(
        'Task description cannot exceed 5000 characters.'
      );
    }

    if (!allowedPriorities.includes(cleanPriority)) {
      return redirectToBoard('Please select a valid task priority.');
    }

    if (
      typeof assignedTo !== 'string' ||
      !mongoose.isValidObjectId(assignedTo)
    ) {
      return redirectToBoard(
        'Please select a valid active project member.'
      );
    }

    let parsedDueDate = null;

    if (dueDate) {
      if (typeof dueDate !== 'string') {
        return redirectToBoard('Please provide a valid deadline.');
      }

      parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return redirectToBoard('Please provide a valid deadline.');
      }
    }

    try {
      const project = await Project.findOne({
        _id: projectId,
        creatorId: req.session.user._id
      })
        .select('_id title status')
        .lean();

      if (!project) {
        return res.status(403).render('500', {
          title: '403 — Access Denied',
          error: 'You are not authorized to create tasks for this project.'
        });
      }

      if (
        ['completed', 'archived'].includes(project.status)
      ) {
        return redirectToBoard(
          'Tasks cannot be created for completed or archived projects.'
        );
      }

      const membership = await ProjectMember.findOne({
        projectId: project._id,
        studentId: assignedTo,
        status: 'active'
      })
        .select('_id studentId')
        .lean();

      if (!membership) {
        return redirectToBoard(
          'The selected student is not an active member of this project.'
        );
      }

      const student = await User.findOne({
        _id: membership.studentId,
        role: 'student',
        status: 'approved'
      })
        .select('_id')
        .lean();

      if (!student) {
        return redirectToBoard(
          'The selected student account is not approved.'
        );
      }

      const task = new Task({
        projectId: project._id,
        title: cleanTitle,
        description: cleanDescription,
        priority: cleanPriority,
        assignedTo: student._id,
        createdBy: req.session.user._id,
        dueDate: parsedDueDate,
        status: 'todo'
      });

      await task.save();

      console.log(
        `Task created: ${task._id} for project ${project._id}`
      );

      return redirectToBoard('Task created successfully.');

    } catch (err) {
      console.error('Alumni task creation error:', err);

      if (err.name === 'ValidationError') {
        return redirectToBoard(
          'Task details are invalid. Please check your entries.'
        );
      }

      return redirectToBoard(
        'Task creation failed. Please try again.'
      );
    }
  }
);


// ─────────────────────────────────────────────
// POST /alumni/projects/:projectId/tasks/:taskId/review
// Approve a submission or request student revisions
// ─────────────────────────────────────────────

router.post(
  '/projects/:projectId/tasks/:taskId/review',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    const { projectId, taskId } = req.params;

    const alumniId = req.session.user._id;

    const redirectToBoard = (message) => {
      return res.redirect(
        `/projects/${projectId}/tasks?message=${encodeURIComponent(message)}`
      );
    };

    if (
      !mongoose.isValidObjectId(projectId) ||
      !mongoose.isValidObjectId(taskId)
    ) {
      return res.status(400).send('Invalid project or task ID.');
    }

    if (!isDbConnected()) {
      return res.status(503).render('500', {
        title: '503 — Service Unavailable',
        error: 'Task review is temporarily unavailable.'
      });
    }

    try {
      const decision =
        typeof req.body.decision === 'string'
          ? req.body.decision.trim()
          : '';

      const feedback =
        typeof req.body.feedback === 'string'
          ? req.body.feedback.trim()
          : '';

      const allowedDecisions = [
        'approved',
        'revision_requested'
      ];

      if (!allowedDecisions.includes(decision)) {
        return redirectToBoard(
          'Please select a valid review decision.'
        );
      }

      if (feedback.length > 3000) {
        return redirectToBoard(
          'Review feedback cannot exceed 3000 characters.'
        );
      }

      if (
        decision === 'revision_requested' &&
        !feedback
      ) {
        return redirectToBoard(
          'Feedback is required when requesting revisions.'
        );
      }

      const project = await Project.findOne({
        _id: projectId,
        creatorId: alumniId
      })
        .select('_id title')
        .lean();

      if (!project) {
        return res.status(403).render('500', {
          title: '403 — Access Denied',
          error: 'You are not authorized to review this project.'
        });
      }

      const task = await Task.findOne({
        _id: taskId,
        projectId: project._id,
        status: 'review'
      })
        .select('_id')
        .lean();

      if (!task) {
        return redirectToBoard(
          'This task is not awaiting review or has already been processed.'
        );
      }

      const updateFields = {
        reviewFeedback: feedback,
        reviewedBy: alumniId,
        reviewedAt: new Date(),
        reviewDecision: decision
      };

      if (decision === 'approved') {
        updateFields.status = 'completed';
        updateFields.completedAt = new Date();
      } else {
        updateFields.status = 'in_progress';
        updateFields.completedAt = null;
      }

      const updatedTask = await Task.findOneAndUpdate(
        {
          _id: task._id,
          projectId: project._id,
          status: 'review'
        },
        {
          $set: updateFields
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedTask) {
        return redirectToBoard(
          'The task was already reviewed. Please refresh the page.'
        );
      }

      console.log(
        `Alumni ${decision} task ${updatedTask._id}`
      );

      if (decision === 'approved') {
        return redirectToBoard(
          'Task approved successfully.'
        );
      }

      return redirectToBoard(
        'Revision requested. The student can now update and resubmit the work.'
      );

    } catch (error) {
      console.error('Alumni task review error:', error);

      return redirectToBoard(
        'Unable to process the task review. Please try again.'
      );
    }
  }
);


// ─────────────────────────────────────────────
// POST /alumni/projects/:projectId/reviews/:studentId
// Submit an individual project review for a student
// Alumni only — completed projects only
// ─────────────────────────────────────────────

router.post(
  '/projects/:projectId/reviews/:studentId',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    const { projectId, studentId } = req.params;

    const alumniId = req.session.user._id;

    const redirectToBoard = (message) => {
      return res.redirect(
        `/projects/${projectId}/tasks?message=${encodeURIComponent(message)}`
      );
    };

    // 1. Validate IDs.
    if (
      !mongoose.isValidObjectId(projectId) ||
      !mongoose.isValidObjectId(studentId)
    ) {
      return res.status(400).send(
        'Invalid project or student ID.'
      );
    }

    // 2. Check database availability.
    if (!isDbConnected()) {
      return res.status(503).render('500', {
        title: '503 — Service Unavailable',
        error: 'Project reviews are temporarily unavailable.'
      });
    }

    try {
      // 3. Read and validate the submitted review.
      const {
        rating,
        technicalSkills,
        communication,
        teamwork,
        feedback
      } = req.body;

      const parseRating = (value) => {
        if (
          value === undefined ||
          value === null ||
          value === ''
        ) {
          return null;
        }

        const parsed = Number(value);

        if (
          !Number.isInteger(parsed) ||
          parsed < 1 ||
          parsed > 5
        ) {
          return NaN;
        }

        return parsed;
      };

      const overallRating = parseRating(rating);
      const technicalRating = parseRating(technicalSkills);
      const communicationRating = parseRating(communication);
      const teamworkRating = parseRating(teamwork);

      const cleanFeedback =
        typeof feedback === 'string'
          ? feedback.trim()
          : '';

      if (
        overallRating === null ||
        Number.isNaN(overallRating)
      ) {
        return redirectToBoard(
          'Please provide a valid overall rating from 1 to 5.'
        );
      }

      if (
        Number.isNaN(technicalRating) ||
        Number.isNaN(communicationRating) ||
        Number.isNaN(teamworkRating)
      ) {
        return redirectToBoard(
          'Skill ratings must be whole numbers from 1 to 5.'
        );
      }

      if (
        cleanFeedback.length < 10 ||
        cleanFeedback.length > 3000
      ) {
        return redirectToBoard(
          'Feedback must contain between 10 and 3000 characters.'
        );
      }

      // 4. Confirm the alumni owns this project.
      const project = await Project.findOne({
        _id: projectId,
        creatorId: alumniId,
        status: 'completed'
      })
        .select('_id title creatorId status')
        .lean();

      if (!project) {
        return redirectToBoard(
          'Only the owner of a completed project can submit student reviews.'
        );
      }

      // 5. Confirm the student completed this project.
      const membership = await ProjectMember.findOne({
        projectId: project._id,
        studentId,
        status: 'completed'
      })
        .select('_id studentId status')
        .lean();

      if (!membership) {
        return redirectToBoard(
          'This student is not a completed member of this project.'
        );
      }

      // 6. Confirm the student account is approved.
      const student = await User.findOne({
        _id: membership.studentId,
        role: 'student',
        status: 'approved'
      })
        .select('_id fullName')
        .lean();

      if (!student) {
        return redirectToBoard(
          'The student account could not be verified.'
        );
      }

      // 7. Prevent duplicate reviews.
      const existingReview = await Review.findOne({
        projectId: project._id,
        reviewerId: alumniId,
        revieweeId: student._id,
        reviewType: 'alumni_to_student'
      })
        .select('_id')
        .lean();

      if (existingReview) {
        return redirectToBoard(
          `You have already reviewed ${student.fullName}.`
        );
      }

      // 8. Save the project review.
      const newReview = new Review({
        projectId: project._id,
        reviewerId: alumniId,
        revieweeId: student._id,
        reviewType: 'alumni_to_student',

        rating: overallRating,
        technicalSkills: technicalRating,
        communication: communicationRating,
        teamwork: teamworkRating,

        feedback: cleanFeedback,
        isVisible: true
      });

      await newReview.save();

      console.log(
        `Project review created: ${newReview._id} for student ${student._id}`
      );

      return redirectToBoard(
        `Review submitted successfully for ${student.fullName}.`
      );

    } catch (err) {
      console.error('Project review submission error:', err);

      // The unique database index also prevents duplicate
      // submissions if two requests arrive simultaneously.
      if (err.code === 11000) {
        return redirectToBoard(
          'You have already submitted a review for this student.'
        );
      }

      if (err.name === 'ValidationError') {
        return redirectToBoard(
          'Review details are invalid. Please check your ratings and feedback.'
        );
      }

      return redirectToBoard(
        'Unable to submit the project review. Please try again.'
      );
    }
  }
);


// ─────────────────────────────────────────────
// POST /alumni/projects/:projectId/complete
// Complete a project after all tasks are approved
// ─────────────────────────────────────────────

router.post(
  '/projects/:projectId/complete',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    const { projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.redirect('/alumni/dashboard');
    }

    if (!isDbConnected()) {
      return res.status(503).render('500', {
        title: '503 — Service Unavailable',
        error: 'Database is offline. The project could not be completed.'
      });
    }

    const session = await mongoose.startSession();

    try {
      let result = 'error';

      await session.withTransaction(async () => {
        const project = await Project.findOne({
          _id: projectId,
          creatorId: req.session.user._id
        }).session(session);

        if (!project) {
          result = 'not_found';
          return;
        }

        if (project.status === 'completed') {
          result = 'already_completed';
          return;
        }

        if (project.status === 'archived') {
          result = 'archived';
          return;
        }

        const taskCount = await Task.countDocuments({
          projectId: project._id
        }).session(session);

        if (taskCount === 0) {
          result = 'no_tasks';
          return;
        }

        const pendingTask = await Task.findOne({
          projectId: project._id,
          $or: [
            { status: { $ne: 'completed' } },
            { reviewDecision: { $ne: 'approved' } }
          ]
        })
          .select('_id')
          .session(session)
          .lean();

        if (pendingTask) {
          result = 'tasks_pending';
          return;
        }

        project.status = 'completed';
        project.activeStudentCount = 0;

        await project.save({ session });

        await ProjectMember.updateMany(
          {
            projectId: project._id,
            status: 'active'
          },
          {
            $set: {
              status: 'completed',
              completedAt: new Date()
            }
          },
          { session }
        );

        result = 'success';
      });

      if (result === 'success') {
        return res.redirect(
          `/projects/${projectId}/tasks?message=project_completed`
        );
      }

      if (result === 'not_found') {
        return res.status(404).render('404', {
          title: 'Project Not Found — SkillBridge'
        });
      }

      const messages = {
        already_completed: 'This project has already been completed.',
        archived: 'An archived project cannot be completed.',
        no_tasks: 'Add at least one task before completing this project.',
        tasks_pending:
          'All project tasks must be completed and approved before project completion.',
        error: 'The project could not be completed. Please try again.'
      };

      return res.redirect(
        `/projects/${projectId}/tasks?message=${encodeURIComponent(
          messages[result] || messages.error
        )}`
      );

    } catch (err) {
      console.error('Project completion error:', err);

      return res.redirect(
        `/projects/${projectId}/tasks?message=completion_error`
      );

    } finally {
      await session.endSession();
    }
  }
);


module.exports = router;
