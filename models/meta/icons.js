module.exports = (sequelize, DataTypes) => {
  const Meta = sequelize.define("meta", {
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

  return Meta;
};
