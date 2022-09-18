module.exports = (sequelize, DataTypes) => {
  const Meta = sequelize.define("meta", {
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return Meta;
};
