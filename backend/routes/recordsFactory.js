const { body, validationResult } = require('express-validator');
const Record = require('../models/Record');
const requireAuth = require('../middleware/auth');

const allowed = {
  assets: ['name','category','owner','ownerTeam','criticality','status','description'],
  threats: ['title','kind','severity','asset','status','description'],
  risks: ['title','asset','likelihood','impact','score','severity','treatment','status']
};
const validatePayload = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};
function shape(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const result = { ...obj, id: String(obj._id || obj.id) };
  delete result._id; delete result.__v; delete result.owner; delete result.collection;
  if (result.ownerTeam !== undefined) { result.owner = result.ownerTeam; delete result.ownerTeam; }
  return result;
}
module.exports = function recordsRouter(collection) {
  const router = require('express').Router();
  router.use(requireAuth);
  router.get('/', async (req, res, next) => {
    try {
      const docs = await Record.find({ owner: req.userId, collection }).sort({ updatedAt: -1 }).limit(1000);
      res.json(docs.map(shape));
    } catch (e) { next(e); }
  });
  router.post('/', [
    body().isObject().withMessage('A record object is required.'),
    body('name').if((_v,{req})=>collection==='assets').trim().notEmpty().withMessage('Asset name is required.'),
    body('title').if((_v,{req})=>collection!=='assets').trim().notEmpty().withMessage('Title is required.')
  ], validatePayload, async (req, res, next) => {
    try {
      const payload = {};
      for (const key of allowed[collection]) if (req.body[key] !== undefined) payload[key] = req.body[key];
      if (collection === 'assets' && payload.owner !== undefined) { payload.ownerTeam = payload.owner; delete payload.owner; }
      if (collection === 'risks') {
        const likelihood = Number(payload.likelihood), impact = Number(payload.impact);
        if (![1,2,3,4,5].includes(likelihood) || ![1,2,3,4,5].includes(impact)) return res.status(400).json({ message: 'Likelihood and impact must be from 1 to 5.' });
        payload.likelihood = likelihood; payload.impact = impact; payload.score = likelihood * impact;
        payload.severity = payload.score >= 16 ? 'Critical' : payload.score >= 10 ? 'High' : payload.score >= 5 ? 'Medium' : 'Low';
      }
      const doc = await Record.create({ ...payload, owner: req.userId, collection });
      res.status(201).json(shape(doc));
    } catch (e) { next(e); }
  });
  router.put('/:id', async (req, res, next) => {
    try {
      const payload = {};
      for (const key of allowed[collection]) if (req.body[key] !== undefined) payload[key] = req.body[key];
      if (collection === 'assets' && payload.owner !== undefined) { payload.ownerTeam = payload.owner; delete payload.owner; }
      if (collection === 'risks') {
        const likelihood = Number(payload.likelihood), impact = Number(payload.impact);
        if (![1,2,3,4,5].includes(likelihood) || ![1,2,3,4,5].includes(impact)) return res.status(400).json({ message: 'Likelihood and impact must be from 1 to 5.' });
        payload.likelihood = likelihood; payload.impact = impact; payload.score = likelihood * impact;
        payload.severity = payload.score >= 16 ? 'Critical' : payload.score >= 10 ? 'High' : payload.score >= 5 ? 'Medium' : 'Low';
      }
      const doc = await Record.findOneAndUpdate({ _id:req.params.id, owner:req.userId, collection }, { $set:payload }, { new:true, runValidators:true });
      if (!doc) return res.status(404).json({ message:'Record not found.' });
      res.json(shape(doc));
    } catch (e) { next(e); }
  });
  router.delete('/:id', async (req, res, next) => {
    try {
      const doc = await Record.findOneAndDelete({ _id:req.params.id, owner:req.userId, collection });
      if (!doc) return res.status(404).json({ message:'Record not found.' });
      res.json({ message:'Record deleted.' });
    } catch (e) { next(e); }
  });
  return router;
};
