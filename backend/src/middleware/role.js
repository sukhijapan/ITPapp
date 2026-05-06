module.exports = (allowedRoleIds) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoleIds.includes(req.user.roleId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};
