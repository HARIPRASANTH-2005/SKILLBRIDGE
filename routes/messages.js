
// ─────────────────────────────────────────────
// routes/messages.js
// SkillBridge Project Messaging Routes
// ─────────────────────────────────────────────

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Models
const User = require('../models/User');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Middleware
const {
  requireAuth,
  requireApproved
} = require('../middleware/auth');


// ─────────────────────────────────────────────
// CONSTANTS AND HELPERS
// ─────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 5000;
const MESSAGE_PAGE_SIZE = 50;

function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(String(id || ''));
}

function getSessionUserId(req) {
  return req.session?.user?._id ||
    req.session?.user?.id ||
    null;
}

function databaseAvailable() {
  return mongoose.connection.readyState === 1;
}

function renderUnavailable(res) {
  return res.status(503).send(
    'Messaging is temporarily unavailable. Please try again later.'
  );
}


// ─────────────────────────────────────────────
// LOAD CURRENT APPROVED USER
// ─────────────────────────────────────────────

async function getCurrentUser(req) {
  const userId = getSessionUserId(req);

  if (!isValidObjectId(userId)) {
    return null;
  }

  return User.findOne({
    _id: userId,
    status: 'approved',
    role: { $in: ['student', 'alumni'] }
  }).select('_id fullName role status');
}


// ─────────────────────────────────────────────
// CHECK PROJECT ACCESS
// ─────────────────────────────────────────────

async function getProjectAccess(projectId, user) {
  const project = await Project.findById(projectId);

  if (!project || project.status === 'archived') {
    return null;
  }

  // Alumni can access only projects they created.
  if (
    user.role === 'alumni' &&
    project.creatorId.equals(user._id)
  ) {
    return {
      project,
      isOwner: true,
      membership: null
    };
  }

  // Students must have an active membership.
  if (user.role === 'student') {
    const membership = await ProjectMember.findOne({
      projectId: project._id,
      studentId: user._id,
      status: 'active'
    });

    if (membership) {
      return {
        project,
        isOwner: false,
        membership
      };
    }
  }

  return null;
}


// ─────────────────────────────────────────────
// GET APPROVED PROJECT PARTICIPANTS
// ─────────────────────────────────────────────

async function getProjectParticipantIds(project, user) {
  const memberships = await ProjectMember.find({
    projectId: project._id,
    status: 'active'
  }).select('studentId');

  const studentIds = memberships.map(member => member.studentId);

  const approvedStudents = await User.find({
    _id: { $in: studentIds },
    role: 'student',
    status: 'approved'
  }).select('_id');

  const participantIds = [
    project.creatorId,
    ...approvedStudents.map(student => student._id)
  ];

  // Ensure the current user is included.
  participantIds.push(user._id);

  // Remove duplicate ObjectIds.
  return [
    ...new Map(
      participantIds.map(id => [id.toString(), id])
    ).values()
  ];
}


// ─────────────────────────────────────────────
// FIND OR CREATE PROJECT CONVERSATION
// ─────────────────────────────────────────────

async function getOrCreateProjectConversation(project, user) {
  const participantIds = await getProjectParticipantIds(
    project,
    user
  );

  if (participantIds.length < 2) {
    return null;
  }

  let conversation = await Conversation.findOne({
    type: 'project',
    projectId: project._id
  });

  if (!conversation) {
    try {
      conversation = await Conversation.create({
        type: 'project',
        projectId: project._id,
        participantIds,
        createdBy: project.creatorId
      });
    } catch (error) {
      // Another request may have created it simultaneously.
      if (error.code !== 11000) {
        throw error;
      }

      conversation = await Conversation.findOne({
        type: 'project',
        projectId: project._id
      });
    }
  }

  if (!conversation) {
    throw new Error('Unable to create project conversation.');
  }

  // Add newly approved active members.
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $addToSet: {
        participantIds: { $each: participantIds }
      }
    }
  );

  return conversation;
}


// ─────────────────────────────────────────────
// LOAD MESSAGES AND RENDER CONVERSATION
// ─────────────────────────────────────────────

async function renderConversation(
  req,
  res,
  user,
  conversation,
  project
) {
  const messages = await Message.find({
    conversationId: conversation._id
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(MESSAGE_PAGE_SIZE)
    .populate('senderId', 'fullName')
    .lean();

  messages.reverse();

  const formattedMessages = messages.map(message => ({
    _id: message._id.toString(),
    senderId: message.senderId?._id?.toString() || '',
    senderName: message.senderId?.fullName || 'Unknown user',
    content: message.isDeleted
      ? 'This message was deleted.'
      : message.content,
    isDeleted: message.isDeleted,
    createdAt: message.createdAt
  }));

  const participantIds = await getProjectParticipantIds(
    project,
    user
  );

  const participants = await User.find({
    _id: { $in: participantIds },
    status: 'approved'
  }).select('fullName');

  const participantNames = participants
    .map(person => person.fullName)
    .join(', ');

  const conversations = [{
    _id: conversation._id.toString(),
    projectId: project._id.toString(),
    projectTitle: project.title,
    lastMessageTime: conversation.lastMessageAt,
    lastMessage: conversation.lastMessagePreview ||
      'No messages yet.'
  }];

  return res.render('messages/index', {
    title: 'Project Messages — SkillBridge',
    conversations,
    activeConversation: {
      _id: conversation._id.toString(),
      projectId: project._id.toString(),
      projectTitle: project.title,
      participantNames
    },
    messages: formattedMessages
  });
}


// ─────────────────────────────────────────────
// GLOBAL MESSAGING AUTHENTICATION
// ─────────────────────────────────────────────

router.use(requireAuth, requireApproved);


// ─────────────────────────────────────────────
// GET /messages
// List conversations available to the user.
// ─────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    if (!databaseAvailable()) {
      return renderUnavailable(res);
    }

    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(403).send(
        'Your account is not authorized to use messaging.'
      );
    }

    let projectIds = [];

    if (user.role === 'alumni') {
      const projects = await Project.find({
        creatorId: user._id
      }).select('_id');

      projectIds = projects.map(project => project._id);
    } else {
      const memberships = await ProjectMember.find({
        studentId: user._id,
        status: 'active'
      }).select('projectId');

      projectIds = memberships.map(member => member.projectId);
    }

    if (projectIds.length === 0) {
      return res.render('messages/index', {
        title: 'Project Messages — SkillBridge',
        conversations: [],
        activeConversation: null,
        messages: []
      });
    }

    const conversations = await Conversation.find({
      type: 'project',
      projectId: { $in: projectIds },
      isArchived: false
    })
      .populate('projectId', 'title')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(50)
      .lean();

    const formattedConversations = conversations
      .filter(conversation => conversation.projectId)
      .map(conversation => ({
        _id: conversation._id.toString(),
        projectId: conversation.projectId._id.toString(),
        projectTitle: conversation.projectId.title,
        lastMessageTime: conversation.lastMessageAt,
        lastMessage: conversation.lastMessagePreview ||
          'No messages yet.'
      }));

    return res.render('messages/index', {
      title: 'Project Messages — SkillBridge',
      conversations: formattedConversations,
      activeConversation: null,
      messages: []
    });

  } catch (error) {
    console.error('Messaging list error:', error.message);
    return res.status(500).send(
      'Unable to load your conversations.'
    );
  }
});


// ─────────────────────────────────────────────
// GET /messages/project/:projectId
// Open or create a project's group conversation.
// ─────────────────────────────────────────────

router.get('/project/:projectId', async (req, res) => {
  try {
    if (!databaseAvailable()) {
      return renderUnavailable(res);
    }

    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(403).send('Access denied.');
    }

    const { projectId } = req.params;

    if (!isValidObjectId(projectId)) {
      return res.status(400).send('Invalid project ID.');
    }

    const access = await getProjectAccess(projectId, user);

    if (!access) {
      return res.status(403).send(
        'You are not an active participant in this project.'
      );
    }

    const conversation = await getOrCreateProjectConversation(
      access.project,
      user
    );

    if (!conversation) {
      return res.status(409).send(
        'Project messaging becomes available after at least one approved student joins the project.'
      );
    }

    return res.redirect(`/messages/${conversation._id}`);

  } catch (error) {
    console.error('Open project conversation error:', error.message);
    return res.status(500).send(
      'Unable to open this project conversation.'
    );
  }
});


// ─────────────────────────────────────────────
// GET /messages/:conversationId
// Open a conversation and load its messages.
// ─────────────────────────────────────────────

router.get('/:conversationId', async (req, res) => {
  try {
    if (!databaseAvailable()) {
      return renderUnavailable(res);
    }

    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(403).send('Access denied.');
    }

    const { conversationId } = req.params;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).send('Invalid conversation ID.');
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: 'project',
      isArchived: false
    });

    if (!conversation) {
      return res.status(404).send('Conversation not found.');
    }

    const access = await getProjectAccess(
      conversation.projectId,
      user
    );

    if (!access) {
      return res.status(403).send(
        'You do not have access to this conversation.'
      );
    }

    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $addToSet: {
          participantIds: {
            $each: await getProjectParticipantIds(
              access.project,
              user
            )
          }
        }
      }
    );

    return renderConversation(
      req,
      res,
      user,
      conversation,
      access.project
    );

  } catch (error) {
    console.error('Open conversation error:', error.message);
    return res.status(500).send(
      'Unable to load this conversation.'
    );
  }
});


// ─────────────────────────────────────────────
// POST /messages/:conversationId
// Send a text message.
// ─────────────────────────────────────────────

router.post('/:conversationId', async (req, res) => {
  try {
    if (!databaseAvailable()) {
      return renderUnavailable(res);
    }

    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(403).send('Access denied.');
    }

    const { conversationId } = req.params;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).send('Invalid conversation ID.');
    }

    const content = String(req.body.content || '').trim();

    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).send(
        'Message must contain between 1 and 5000 characters.'
      );
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      type: 'project',
      isArchived: false
    });

    if (!conversation) {
      return res.status(404).send('Conversation not found.');
    }

    const access = await getProjectAccess(
      conversation.projectId,
      user
    );

    if (!access) {
      return res.status(403).send(
        'You cannot send messages in this project.'
      );
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: user._id,
      content
    });

    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          lastMessageAt: message.createdAt,
          lastMessagePreview: content.slice(0, 200)
        }
      }
    );

    return res.redirect(`/messages/${conversation._id}`);

  } catch (error) {
    console.error('Send message error:', error.message);
    return res.status(500).send(
      'Unable to send your message.'
    );
  }
});


// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────

module.exports = router;
