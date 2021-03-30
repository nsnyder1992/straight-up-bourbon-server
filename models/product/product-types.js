module.exports = (sequelize, DataTypes) => {
  const ProductTypes = sequelize.define("product-type", {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.INTEGER,
    },
  });

  return ProductTypes;
};
