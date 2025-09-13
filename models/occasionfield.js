export default (sequelize, DataTypes) => {
  const OccasionField = sequelize.define(
    "OccasionField",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      occasion_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      field_key: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      label: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      option: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      order_no: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "occasion_fields",
      timestamps: true,
      underscored: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  return OccasionField;
};
