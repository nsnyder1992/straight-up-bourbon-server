module.exports = (sequelize, DataTypes) => {
  const ProductSizes = sequelize.define("product-sizes", {
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return ProductSizes;
};
