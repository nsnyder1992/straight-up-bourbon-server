module.exports = (sequelize, DataTypes) => {
  const Icon = sequelize.define("icon", {
    name: {
      type: DataTypes.STRING,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return Icon;
};
