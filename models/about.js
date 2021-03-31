module.exports = (sequelize, DataTypes) => {
  const About = sequelize.define("about", {
    text: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    photoUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return About;
};
