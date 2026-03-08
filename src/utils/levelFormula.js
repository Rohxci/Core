function getXpRequiredForLevel(level) {
  if (level <= 5) return 60;

  const blockIndex = Math.floor((level - 1) / 5);
  return 60 + (blockIndex * 30);
}

function addXpToProgress(currentLevel, currentXp, addedXp) {
  let level = currentLevel;
  let xp = currentXp + addedXp;
  let leveledUp = false;

  while (xp >= getXpRequiredForLevel(level)) {
    xp -= getXpRequiredForLevel(level);
    level += 1;
    leveledUp = true;
  }

  return {
    level,
    xp,
    leveledUp,
    xpNeeded: getXpRequiredForLevel(level)
  };
}

function getXpRemaining(level, xp) {
  const needed = getXpRequiredForLevel(level);
  return Math.max(needed - xp, 0);
}

module.exports = {
  getXpRequiredForLevel,
  addXpToProgress,
  getXpRemaining
};
