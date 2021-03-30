module.exports = (sequelize, DataTypes) => {
  const ProductDescriptions = sequelize.define("product-descriptions", {
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return ProductDescriptions;
};
