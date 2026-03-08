const { PermissionFlagsBits } = require("discord.js");

function hasStaffPermission(member) {
  if (!member) return false;

  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

module.exports = {
  hasStaffPermission
};
