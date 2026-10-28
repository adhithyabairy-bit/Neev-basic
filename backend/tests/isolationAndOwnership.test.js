import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  getClassById,
  updateClass,
  deleteClass,
} from '../src/controllers/classController.js';
import {
  createAssessment,
  getAssessmentById,
  updateAssessment,
} from '../src/controllers/assessmentController.js';

describe('Teacher Ownership Isolation & ID Validation Tests', () => {
  const teacherA_Id = new mongoose.Types.ObjectId();
  const teacherB_Id = new mongoose.Types.ObjectId();
  const foreignClassId = new mongoose.Types.ObjectId();
  const foreignAssessmentId = new mongoose.Types.ObjectId();

  describe('ID Format Validation', () => {
    it('getClassById rejects invalid ObjectId strings with HTTP 400', async () => {
      const req = {
        params: { id: 'invalid-id-123' },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      await getClassById(req, res, (err) => { throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.code, 'INVALID_ID_FORMAT');
    });

    it('updateClass rejects invalid ObjectId strings with HTTP 400', async () => {
      const req = {
        params: { id: 'bad-format-id' },
        teacher: { _id: teacherA_Id },
        body: { name: 'New Name' },
      };
      const res = createMockResponse();

      await updateClass(req, res, (err) => { throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, 'INVALID_ID_FORMAT');
    });

    it('getAssessmentById rejects invalid ObjectId strings with HTTP 400', async () => {
      const req = {
        params: { id: 'bad-assessment-id' },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      await getAssessmentById(req, res, (err) => { throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, 'INVALID_ID_FORMAT');
    });
  });

  describe('Cross-Teacher Ownership Barriers (Negative Tests)', () => {
    it('createAssessment rejects invalid or foreign classId with HTTP 400 or 404', async () => {
      const req = {
        teacher: { _id: teacherB_Id },
        body: {
          classId: 'not-an-id',
          title: 'Unit Test',
          maximumMarks: 50,
        },
      };
      const res = createMockResponse();

      await createAssessment(req, res, (err) => { throw err; });

      assert.equal(res.statusCode, 400);
      assert.equal(res.data.code, 'INVALID_CLASS_ID');
    });

    it('createAssessment rejects zero or negative maximumMarks with HTTP 400', async () => {
      const req = {
        teacher: { _id: teacherA_Id },
        body: {
          classId: new mongoose.Types.ObjectId().toString(),
          title: 'Math Quiz',
          maximumMarks: 0,
        },
      };
      const res = createMockResponse();

      // Mock Class.findOne to simulate an owned class exists
      const originalFindOne = mongoose.models.Class.findOne;
      mongoose.models.Class.findOne = () => Promise.resolve({
        _id: new mongoose.Types.ObjectId(req.body.classId),
        subject: 'Mathematics',
      });

      try {
        await createAssessment(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 400);
        assert.equal(res.data.code, 'INVALID_MAXIMUM_MARKS');
      } finally {
        mongoose.models.Class.findOne = originalFindOne;
      }
    });

    it('createAssessment prevents Teacher B from creating assessment for Teacher A class', async () => {
      const req = {
        teacher: { _id: teacherB_Id },
        body: {
          classId: foreignClassId.toString(),
          title: 'Unauthorized Assessment',
          maximumMarks: 50,
        },
      };
      const res = createMockResponse();

      // Mock Class.findOne returning null (simulating Teacher B does not own Teacher A's class)
      const originalFindOne = mongoose.models.Class.findOne;
      mongoose.models.Class.findOne = (query) => {
        // Query will include { _id: foreignClassId, teacherId: teacherB_Id }
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null);
      };

      try {
        await createAssessment(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'CLASS_NOT_FOUND');
      } finally {
        mongoose.models.Class.findOne = originalFindOne;
      }
    });

    it('updateClass prevents Teacher B from modifying Teacher A class', async () => {
      const req = {
        params: { id: foreignClassId.toString() },
        teacher: { _id: teacherB_Id },
        body: { name: 'Malicious Rename' },
      };
      const res = createMockResponse();

      const originalFindOne = mongoose.models.Class.findOne;
      mongoose.models.Class.findOne = (query) => {
        // Enforce teacherId scoping in query
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null);
      };

      try {
        await updateClass(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'NOT_FOUND');
      } finally {
        mongoose.models.Class.findOne = originalFindOne;
      }
    });

    it('deleteClass prevents Teacher B from deleting Teacher A class', async () => {
      const req = {
        params: { id: foreignClassId.toString() },
        teacher: { _id: teacherB_Id },
      };
      const res = createMockResponse();

      const originalFindOne = mongoose.models.Class.findOne;
      mongoose.models.Class.findOne = (query) => {
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null);
      };

      try {
        await deleteClass(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'NOT_FOUND');
      } finally {
        mongoose.models.Class.findOne = originalFindOne;
      }
    });

    it('deleteClass blocks deletion with HTTP 409 if class has dependent assessments', async () => {
      const classId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: classId.toString() },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      const originalFindOne = mongoose.models.Class.findOne;
      const originalCount = mongoose.models.Assessment.countDocuments;

      mongoose.models.Class.findOne = () => Promise.resolve({
        _id: classId,
        name: 'Class 8-A',
        teacherId: teacherA_Id,
        deleteOne: () => Promise.resolve(),
      });

      // Simulate 3 dependent assessments exist
      mongoose.models.Assessment.countDocuments = () => Promise.resolve(3);

      try {
        await deleteClass(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 409);
        assert.equal(res.data.code, 'CLASS_HAS_DEPENDENT_ASSESSMENTS');
        assert.equal(res.data.details.dependentAssessmentsCount, 3);
      } finally {
        mongoose.models.Class.findOne = originalFindOne;
        mongoose.models.Assessment.countDocuments = originalCount;
      }
    });

    it('deleteClass succeeds with HTTP 200 when class has 0 dependent assessments', async () => {
      const classId = new mongoose.Types.ObjectId();
      const req = {
        params: { id: classId.toString() },
        teacher: { _id: teacherA_Id },
      };
      const res = createMockResponse();

      const originalFindOne = mongoose.models.Class.findOne;
      const originalCount = mongoose.models.Assessment.countDocuments;
      let deleteCalled = false;

      mongoose.models.Class.findOne = () => Promise.resolve({
        _id: classId,
        name: 'Empty Class 7-B',
        teacherId: teacherA_Id,
        deleteOne: () => {
          deleteCalled = true;
          return Promise.resolve();
        },
      });

      // 0 dependent assessments
      mongoose.models.Assessment.countDocuments = () => Promise.resolve(0);

      try {
        await deleteClass(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 200);
        assert.equal(res.data.success, true);
        assert.equal(deleteCalled, true);
        assert.equal(res.data.data.deletedClassName, 'Empty Class 7-B');
      } finally {
        mongoose.models.Class.findOne = originalFindOne;
        mongoose.models.Assessment.countDocuments = originalCount;
      }
    });

    it('updateAssessment prevents Teacher B from modifying Teacher A assessment', async () => {
      const req = {
        params: { id: foreignAssessmentId.toString() },
        teacher: { _id: teacherB_Id },
        body: { title: 'Malicious Assessment Change' },
      };
      const res = createMockResponse();

      const originalFindOne = mongoose.models.Assessment.findOne;
      mongoose.models.Assessment.findOne = (query) => {
        assert.equal(query.teacherId.toString(), teacherB_Id.toString());
        return Promise.resolve(null);
      };

      try {
        await updateAssessment(req, res, (err) => { throw err; });
        assert.equal(res.statusCode, 404);
        assert.equal(res.data.code, 'NOT_FOUND');
      } finally {
        mongoose.models.Assessment.findOne = originalFindOne;
      }
    });
  });
});

function createMockResponse() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.data = payload;
      return res;
    },
  };
  return res;
}
