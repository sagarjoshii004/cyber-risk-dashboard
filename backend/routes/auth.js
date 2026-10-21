const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  next();
};
const tokenFor = user => jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '8h' });
const safeUser = user => ({ id: user._id.toString(), name: user.name, email: user.email });

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters.')
], validate, async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ name: req.body.name, email, passwordHash });
    res.status(201).json({ token: tokenFor(user), user: safeUser(user) });
  } catch (e) { next(e); }
});

router.post('/login', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Enter a valid email address.'),
  body('password').isString().notEmpty().withMessage('Password is required.')
], validate, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    res.json({ token: tokenFor(user), user: safeUser(user) });
  } catch (e) { next(e); }
});
module.exports = router;
