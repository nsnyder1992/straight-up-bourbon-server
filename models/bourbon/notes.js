module.exports = (sequelize, DataTypes) => {
  const Notes = sequelize.define("notes", {
    note: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return Notes;
};
