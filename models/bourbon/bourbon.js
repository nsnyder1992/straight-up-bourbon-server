module.exports = (sequelize, DataTypes) => {
  const Bourbon = sequelize.define("bourbon", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  });

  return Bourbon;
};
